const mongoose = require("mongoose");

const ref = (name) => ({ type: mongoose.Schema.Types.ObjectId, ref: name, required: true });

// short, readable swap id like SW-4F9A2C
const makeCode = () => "SW-" + Math.random().toString(36).slice(2, 8).toUpperCase();

const swapSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, sparse: true, default: makeCode },
    requester: { ...ref("User"), index: true },
    receiver: { ...ref("User"), index: true },
    requestedItem: ref("Item"),
    offeredItem: ref("Item"),
    message: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "COMPLETED"],
      default: "PENDING",
      index: true,
    },
    // tracking timeline: every important step is recorded with who did it and when
    events: [
      {
        label: { type: String, required: true },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],
    // courier / hand-over details each person adds for their item
    shipments: [
      {
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        courier: { type: String, required: true, trim: true },
        trackingNumber: { type: String, default: "", trim: true },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Swap", swapSchema);
