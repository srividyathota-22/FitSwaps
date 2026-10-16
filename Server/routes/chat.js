const express = require("express");
const mongoose = require("mongoose");
const Swap = require("../models/Swap");
const Message = require("../models/Message");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

const ITEM_FIELDS = {
  title: 1, brand: 1, size: 1, condition: 1, estimatedValue: 1, status: 1,
  images: { $slice: 1 },
};

// Loads the swap and makes sure the logged-in user is part of it
async function getSwap(req, res) {
  if (!mongoose.isValidObjectId(req.params.swapId)) {
    res.status(404).json({ message: "Conversation not found." });
    return null;
  }
  const swap = await Swap.findById(req.params.swapId)
    .populate("requester", "name city")
    .populate("receiver", "name city")
    .populate({ path: "requestedItem", select: ITEM_FIELDS })
    .populate({ path: "offeredItem", select: ITEM_FIELDS });
  if (!swap) {
    res.status(404).json({ message: "Conversation not found." });
    return null;
  }
  const uid = String(req.user._id);
  if (String(swap.requester._id) !== uid && String(swap.receiver._id) !== uid) {
    res.status(403).json({ message: "This conversation does not belong to you." });
    return null;
  }
  return swap;
}

router.get("/:swapId", async (req, res) => {
  try {
    const swap = await getSwap(req, res);
    if (!swap) return;
    const messages = await Message.find({ swap: swap._id }).sort({ createdAt: 1 }).limit(300);
    res.json({
      swap,
      messages: messages.map((m) => ({
        _id: m._id,
        sender: String(m.sender),
        text: m.text,
        createdAt: m.createdAt,
      })),
    });
  } catch {
    res.status(500).json({ message: "Could not load the chat." });
  }
});

router.post("/:swapId", async (req, res) => {
  try {
    const swap = await getSwap(req, res);
    if (!swap) return;

    if (!["PENDING", "ACCEPTED"].includes(swap.status))
      return res.status(400).json({ message: "This swap is closed, so you can no longer send messages." });

    const text = (req.body.text || "").trim();
    if (!text) return res.status(400).json({ message: "Type a message first." });
    if (text.length > 500)
      return res.status(400).json({ message: "Messages can be at most 500 characters." });

    const m = await Message.create({ swap: swap._id, sender: req.user._id, text });
    res.status(201).json({
      message: { _id: m._id, sender: String(m.sender), text: m.text, createdAt: m.createdAt },
    });
  } catch {
    res.status(500).json({ message: "Could not send your message." });
  }
});

module.exports = router;