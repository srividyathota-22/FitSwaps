const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Swap = require("../models/Swap");
const Item = require("../models/Item");
const Story = require("../models/Story");
const auth = require("../middleware/auth");

const router = express.Router();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function optionalUser(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return null;
  try {
    const d = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    return await User.findById(d.id).select("-password");
  } catch {
    return null;
  }
}

router.get("/stats", async (req, res) => {
  try {
    const [members, completedSwaps, listings] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Swap.countDocuments({ status: "COMPLETED" }),
      Item.countDocuments({ status: "AVAILABLE" }),
    ]);
    res.json({ members, completedSwaps, listings });
  } catch {
    res.status(500).json({ message: "Could not load community numbers." });
  }
});

router.get("/leaders", async (req, res) => {
  try {
    const leaders = await Swap.aggregate([
      { $match: { status: "COMPLETED" } },
      { $project: { people: ["$requester", "$receiver"] } },
      { $unwind: "$people" },
      { $group: { _id: "$people", swaps: { $sum: 1 } } },
      { $sort: { swaps: -1 } },
      { $limit: 5 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { _id: 0, name: "$user.name", city: "$user.city", swaps: 1 } },
    ]);
    res.json({ leaders });
  } catch {
    res.status(500).json({ message: "Could not load the leaderboard." });
  }
});

router.get("/stories", async (req, res) => {
  try {
    const me = await optionalUser(req);
    const myId = me ? String(me._id) : null;
    const stories = await Story.find().sort({ createdAt: -1 }).limit(30).populate("author", "name city");
    res.json({
      stories: stories.map((s) => ({
        _id: s._id,
        text: s.text,
        createdAt: s.createdAt,
        author: s.author
          ? { _id: s.author._id, name: s.author.name, city: s.author.city }
          : { name: "Former member" },
        likes: s.likes.length,
        liked: myId ? s.likes.some((l) => String(l) === myId) : false,
      })),
    });
  } catch {
    res.status(500).json({ message: "Could not load stories." });
  }
});

router.post("/stories", auth, async (req, res) => {
  try {
    const text = (req.body.text || "").trim();
    if (text.length < 10) return res.status(400).json({ message: "Write at least 10 characters." });
    if (text.length > 280) return res.status(400).json({ message: "Stories can be at most 280 characters." });

    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const recent = await Story.countDocuments({ author: req.user._id, createdAt: { $gte: since } });
    if (recent >= 5)
      return res.status(429).json({ message: "You can share up to 5 stories a day. Please try again tomorrow." });

    await Story.create({ author: req.user._id, text });
    res.status(201).json({ ok: true });
  } catch {
    res.status(500).json({ message: "Could not post your story." });
  }
});

router.post("/stories/:id/like", auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Story not found." });
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "Story not found." });

    const uid = String(req.user._id);
    const idx = story.likes.findIndex((l) => String(l) === uid);
    if (idx >= 0) story.likes.splice(idx, 1);
    else story.likes.push(req.user._id);
    await story.save();
    res.json({ likes: story.likes.length, liked: idx < 0 });
  } catch {
    res.status(500).json({ message: "Could not update your like." });
  }
});

router.delete("/stories/:id", auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Story not found." });
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "Story not found." });
    const own = String(story.author) === String(req.user._id);
    if (!own && req.user.role !== "admin")
      return res.status(403).json({ message: "You can only delete your own stories." });
    await story.deleteOne();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Could not delete the story." });
  }
});
// People in your city who have clothes available to swap
router.get("/nearby", auth, async (req, res) => {
  try {
    const city = (req.user.city || "").trim();
    if (!city) return res.json({ city: "", people: [] });

    const people = await Item.aggregate([
      {
        $match: {
          status: "AVAILABLE",
          city: new RegExp(`^${esc(city)}$`, "i"),
          owner: { $ne: req.user._id },
        },
      },
      { $group: { _id: "$owner", items: { $sum: 1 } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $match: { "user.suspended": { $ne: true } } },
      { $sort: { items: -1 } },
      { $limit: 8 },
      { $project: { items: 1, name: "$user.name", city: "$user.city" } },
    ]);
    res.json({ city, people });
  } catch {
    res.status(500).json({ message: "Could not load nearby swappers." });
  }
});

module.exports = router;