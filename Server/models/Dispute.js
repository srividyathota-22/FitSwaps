const mongoose = require("mongoose");

const REASONS = [
  "Item not received",
  "Item not as described",
  "Other person is not responding",
  "Rude or abusive behaviour",
  "Other",
];

const disputeSchema = new mongoose.Schema(
  {
    swap: { type: mongoose.Schema.Types.ObjectId, ref: "Swap", required: true, index: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: { type: String, enum: REASONS, required: true },
    details: { type: String, default: "", trim: true, maxlength: 500 },
    status: { type: String, enum: ["OPEN", "RESOLVED"], default: "OPEN", index: true },
    resolution: { type: String, default: "", trim: true },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dispute", disputeSchema);
module.exports.REASONS = REASONS;