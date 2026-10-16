const express = require("express");
const mongoose = require("mongoose");
const Swap = require("../models/Swap");
const Item = require("../models/Item");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

const ITEM_FIELDS = {
  title: 1, brand: 1, size: 1, condition: 1, estimatedValue: 1, status: 1, city: 1, code: 1,
  images: { $slice: 1 },
};
const withDetails = (q) =>
  q
    .populate("requester", "name city")
    .populate("receiver", "name city")
    .populate({ path: "requestedItem", select: ITEM_FIELDS })
    .populate({ path: "offeredItem", select: ITEM_FIELDS })
    .populate("events.by", "name")
    .populate("shipments.by", "name");

const EVENT_LABEL = {
  ACCEPTED: "Request accepted",
  REJECTED: "Request rejected",
  CANCELLED: "Swap cancelled",
  COMPLETED: "Swap completed",
};

// Send a swap request
router.post("/", async (req, res) => {
  try {
    const { requestedItemId, offeredItemId } = req.body;
    const message = (req.body.message || "").trim();

    if (!mongoose.isValidObjectId(requestedItemId) || !mongoose.isValidObjectId(offeredItemId))
      return res.status(400).json({ message: "Choose both items for the swap." });
    if (message.length > 300)
      return res.status(400).json({ message: "Message can be at most 300 characters." });

    const [requested, offered] = await Promise.all([
      Item.findById(requestedItemId),
      Item.findById(offeredItemId),
    ]);
    if (!requested || !offered) return res.status(404).json({ message: "Item not found." });

    const uid = String(req.user._id);
    if (String(requested.owner) === uid)
      return res.status(400).json({ message: "You cannot request your own item." });
    if (String(offered.owner) !== uid)
      return res.status(403).json({ message: "You can only offer your own items." });
    if (requested.status !== "AVAILABLE")
      return res.status(409).json({ message: "That item is no longer available." });
    if (offered.status !== "AVAILABLE")
      return res.status(409).json({ message: "Your offered item is not available right now." });

    const dup = await Swap.findOne({
      requestedItem: requested._id,
      offeredItem: offered._id,
      requester: req.user._id,
      status: { $in: ["PENDING", "ACCEPTED"] },
    });
    if (dup) return res.status(409).json({ message: "You already sent this request." });

    const swap = await Swap.create({
      requester: req.user._id,
      receiver: requested.owner,
      requestedItem: requested._id,
      offeredItem: offered._id,
      message,
      events: [{ label: "Swap requested", by: req.user._id }],
    });
    res.status(201).json({ swap });
  } catch {
    res.status(500).json({ message: "Could not send the swap request." });
  }
});

// All my swaps (incoming and outgoing)
router.get("/mine", async (req, res) => {
  try {
    const swaps = await withDetails(
      Swap.find({ $or: [{ requester: req.user._id }, { receiver: req.user._id }] }).sort({ createdAt: -1 })
    );
    res.json({ swaps });
  } catch {
    res.status(500).json({ message: "Could not load your swaps." });
  }
});

// Allowed status changes, and who may make them
const RULES = {
  PENDING: { ACCEPTED: "receiver", REJECTED: "receiver", CANCELLED: "requester" },
  ACCEPTED: { COMPLETED: "either", CANCELLED: "either" },
};

router.patch("/:id/status", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Swap not found." });
    const swap = await Swap.findById(req.params.id);
    if (!swap) return res.status(404).json({ message: "Swap not found." });

    const uid = String(req.user._id);
    const isRequester = String(swap.requester) === uid;
    const isReceiver = String(swap.receiver) === uid;
    if (!isRequester && !isReceiver)
      return res.status(403).json({ message: "This swap does not belong to you." });

    const next = req.body.status;
    const who = RULES[swap.status] && RULES[swap.status][next];
    if (!who)
      return res.status(400).json({ message: `A ${swap.status.toLowerCase()} swap cannot be changed to ${String(next).toLowerCase()}.` });
    if (who === "receiver" && !isReceiver)
      return res.status(403).json({ message: "Only the item owner can do this." });
    if (who === "requester" && !isRequester)
      return res.status(403).json({ message: "Only the person who sent the request can do this." });

    const ids = [swap.requestedItem, swap.offeredItem];

    if (next === "ACCEPTED") {
      const items = await Item.find({ _id: { $in: ids } });
      if (items.length !== 2 || items.some((i) => i.status !== "AVAILABLE"))
        return res.status(409).json({ message: "One of the items is no longer available." });
      await Item.updateMany({ _id: { $in: ids } }, { status: "SWAP_PENDING" });
      // other pending requests for these items can no longer go ahead
      await Swap.updateMany(
        {
          _id: { $ne: swap._id },
          status: "PENDING",
          $or: [{ requestedItem: { $in: ids } }, { offeredItem: { $in: ids } }],
        },
        { status: "CANCELLED" }
      );
    }
    if (next === "COMPLETED") await Item.updateMany({ _id: { $in: ids } }, { status: "SWAPPED" });
    if (next === "CANCELLED" && swap.status === "ACCEPTED")
      await Item.updateMany({ _id: { $in: ids } }, { status: "AVAILABLE" });

    swap.status = next;
    swap.events.push({ label: EVENT_LABEL[next], by: req.user._id });
    await swap.save();
    const full = await withDetails(Swap.findById(swap._id));
    res.json({ swap: full });
  } catch {
    res.status(500).json({ message: "Could not update the swap." });
  }
});

// Add courier / hand-over details for your item (only after the swap is accepted)
router.post("/:id/shipment", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Swap not found." });
    const swap = await Swap.findById(req.params.id);
    if (!swap) return res.status(404).json({ message: "Swap not found." });

    const uid = String(req.user._id);
    if (String(swap.requester) !== uid && String(swap.receiver) !== uid)
      return res.status(403).json({ message: "This swap does not belong to you." });
    if (swap.status !== "ACCEPTED")
      return res.status(400).json({ message: "You can add shipping details after the swap is accepted." });

    const courier = (req.body.courier || "").trim();
    const trackingNumber = (req.body.trackingNumber || "").trim();
    if (!courier || courier.length > 40)
      return res.status(400).json({ message: "Choose how you are sending the item." });
    if (trackingNumber.length > 40)
      return res.status(400).json({ message: "Tracking number can be at most 40 characters." });

    swap.shipments.push({ by: req.user._id, courier, trackingNumber });
    swap.events.push({
      label:
        courier === "Meet in person"
          ? "Items exchanged in person"
          : `Item sent via ${courier}${trackingNumber ? ` (tracking ${trackingNumber})` : ""}`,
      by: req.user._id,
    });
    await swap.save();
    const full = await withDetails(Swap.findById(swap._id));
    res.status(201).json({ swap: full });
  } catch {
    res.status(500).json({ message: "Could not save the shipping details." });
  }
});

module.exports = router;