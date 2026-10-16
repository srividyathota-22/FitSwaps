const express = require("express");
const mongoose = require("mongoose");
const Dispute = require("../models/Dispute");
const Swap = require("../models/Swap");
const auth = require("../middleware/auth");

const router = express.Router();
const { REASONS } = Dispute;

// POST /api/disputes - a swap participant reports a problem
router.post("/", auth, async (req, res) => {
  try {
    const me = String(req.user._id || req.user.id);
    const { swapId, reason } = req.body;
    const details = typeof req.body.details === "string" ? req.body.details.trim() : "";

    if (!swapId || !mongoose.Types.ObjectId.isValid(swapId)) {
      return res.status(400).json({ message: "A valid swap is required." });
    }
    if (!REASONS.includes(reason)) {
      return res.status(400).json({ message: "Please choose a valid reason." });
    }
    if (details.length > 500) {
      return res.status(400).json({ message: "Details must be 500 characters or fewer." });
    }

    const swap = await Swap.findById(swapId);
    if (!swap) return res.status(404).json({ message: "Swap not found." });

    if (String(swap.requester) !== me && String(swap.receiver) !== me) {
      return res.status(403).json({ message: "Only people in this swap can report a problem." });
    }
    if (!["ACCEPTED", "COMPLETED"].includes(swap.status)) {
      return res
        .status(400)
        .json({ message: "Problems can only be reported on accepted or completed swaps." });
    }

    const existing = await Dispute.exists({ swap: swap._id, reporter: me, status: "OPEN" });
    if (existing) {
      return res.status(409).json({ message: "You already have an open report for this swap." });
    }

    const dispute = await Dispute.create({ swap: swap._id, reporter: me, reason, details });

    swap.events.push({ label: `Problem reported: ${reason}`, by: me });
    await swap.save();

    res.status(201).json(dispute);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not submit the report." });
  }
});

module.exports = router;