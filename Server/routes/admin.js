const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Item = require("../models/Item");
const Swap = require("../models/Swap");
const Message = require("../models/Message");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/admin");
const Dispute = require("../models/Dispute");

const router = express.Router();
router.use(auth, adminOnly);
router.get("/stats", async (req, res) => {
  try {
    const week = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [users, items, activeItems, activeSwaps, completed, requests, newUsers, newItems] =
      await Promise.all([
        User.countDocuments(),
        Item.countDocuments(),
        Item.countDocuments({ status: "AVAILABLE" }),
        Swap.countDocuments({ status: { $in: ["PENDING", "ACCEPTED"] } }),
        Swap.countDocuments({ status: "COMPLETED" }),
        Swap.countDocuments(),
        User.countDocuments({ createdAt: { $gte: week } }),
        Item.countDocuments({ createdAt: { $gte: week } }),
      ]);
    const openDisputes = await Dispute.countDocuments({ status: "OPEN" });
    const [listers, requesters, chatters] = await Promise.all([
      Item.distinct("owner", { createdAt: { $gte: week } }),
      Swap.distinct("requester", { createdAt: { $gte: week } }),
      Message.distinct("sender", { createdAt: { $gte: week } }),
    ]);
    const activeUsers = new Set([...listers, ...requesters, ...chatters].map(String)).size;
    const conversion = requests ? Math.round((completed / requests) * 100) : 0;

    res.json({
      stats: {
        users, items, activeItems, activeSwaps, completed, requests,
        newUsers, newItems, openDisputes, activeUsers, conversion,
      },
    });
  } catch {
    res.status(500).json({ message: "Could not load stats." });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 }).limit(200);
    res.json({ users });
  } catch {
    res.status(500).json({ message: "Could not load users." });
  }
});

router.patch("/users/:id/suspend", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "User not found." });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found." });
    if (target.role === "admin")
      return res.status(400).json({ message: "Admin accounts cannot be suspended." });
    target.suspended = !!req.body.suspended;
    await target.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Could not update the user." });
  }
});

router.get("/items", async (req, res) => {
  try {
    const items = await Item.find()
      .select({ images: { $slice: 1 } })
      .populate("owner", "name")
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ items });
  } catch {
    res.status(500).json({ message: "Could not load listings." });
  }
});

router.patch("/items/:id/hide", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Item not found." });
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found." });

    if (req.body.hidden) {
      if (item.status !== "AVAILABLE" && item.status !== "HIDDEN")
        return res.status(409).json({ message: "This item is part of a swap, so it cannot be hidden now." });
      item.status = "HIDDEN";
    } else if (item.status === "HIDDEN") {
      item.status = "AVAILABLE";
    }
    await item.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Could not update the listing." });
  }
});

router.get("/swaps", async (req, res) => {
  try {
    const swaps = await Swap.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("requester", "name")
      .populate("receiver", "name")
      .populate({ path: "requestedItem", select: "title" })
      .populate({ path: "offeredItem", select: "title" });
    res.json({ swaps });
  } catch {
    res.status(500).json({ message: "Could not load swaps." });
  }
});

router.get("/swaps/:id/messages", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Swap not found." });
    const messages = await Message.find({ swap: req.params.id })
      .populate("sender", "name")
      .sort({ createdAt: 1 });
    res.json({
      messages: messages.map((m) => ({
        _id: m._id,
        sender: m.sender?.name || "Unknown",
        text: m.text,
        createdAt: m.createdAt,
      })),
    });
  } catch {
    res.status(500).json({ message: "Could not load the chat." });
  }
});
router.delete("/items/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Item not found." });
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found." });

    const inSwap = await Swap.exists({
      $or: [{ requestedItem: item._id }, { offeredItem: item._id }],
    });
    if (inSwap)
      return res.status(409).json({
        message: "This item is part of a swap, so it cannot be deleted. Hide it instead.",
      });

    await item.deleteOne();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Could not delete the listing." });
  }
});

router.get("/disputes", async (req, res) => {
  try {
    const disputes = await Dispute.find()
      .sort({ status: 1, createdAt: -1 }) // "OPEN" sorts before "RESOLVED"
      .populate("reporter", "name email")
      .populate("resolvedBy", "name")
      .populate({
        path: "swap",
        select: "code status requester receiver",
        populate: [
          { path: "requester", select: "name" },
          { path: "receiver", select: "name" },
        ],
      });
    res.json({ disputes });
  } catch {
    res.status(500).json({ message: "Could not load disputes." });
  }
});

router.patch("/disputes/:id/resolve", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Dispute not found." });
    const note = typeof req.body.note === "string" ? req.body.note.trim() : "";
    if (note.length < 5 || note.length > 300)
      return res.status(400).json({ message: "Resolution note must be 5 to 300 characters." });

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ message: "Dispute not found." });
    if (dispute.status === "RESOLVED")
      return res.status(409).json({ message: "This dispute is already resolved." });

    dispute.status = "RESOLVED";
    dispute.resolution = note;
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();
    await dispute.save();

    const swap = await Swap.findById(dispute.swap);
    if (swap) {
      swap.events.push({ label: `Dispute resolved by admin: ${note}`, by: req.user._id });
      await swap.save();
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Could not resolve the dispute." });
  }
});

const TZ = "Asia/Kolkata";
const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD

router.get("/analytics", async (req, res) => {
  try {
    const DAYS = 14;
    const days = [];
    for (let i = DAYS - 1; i >= 0; i--) days.push(dayKey(new Date(Date.now() - i * 86400000)));
    const since = new Date(`${days[0]}T00:00:00+05:30`);

    const perDay = async (Model, field, match = {}) => {
      const rows = await Model.aggregate([
        { $match: { ...match, [field]: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: `$${field}`, timezone: TZ } },
            n: { $sum: 1 },
          },
        },
      ]);
      const map = Object.fromEntries(rows.map((r) => [r._id, r.n]));
      return days.map((d) => map[d] || 0);
    };

    const [newUsers, newListings, swapRequests, swapsCompleted, cats, secs, sts] =
      await Promise.all([
        perDay(User, "createdAt"),
        perDay(Item, "createdAt"),
        perDay(Swap, "createdAt"),
        perDay(Swap, "updatedAt", { status: "COMPLETED" }),
        Item.aggregate([
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ]),
        Item.aggregate([{ $group: { _id: "$section", count: { $sum: 1 } } }]),
        Swap.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      ]);

    const shape = (rows) => rows.map((r) => ({ label: r._id, count: r.count }));

    res.json({
      days,
      newUsers,
      newListings,
      swapRequests,
      swapsCompleted,
      categories: shape(cats),
      sections: shape(secs),
      swapStatuses: shape(sts),
    });
  } catch {
    res.status(500).json({ message: "Could not load analytics." });
  }
});

module.exports = router;