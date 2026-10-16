const mongoose = require("mongoose");

// short, readable item id like FS-7K2P9A
const makeCode = () => "FS-" + Math.random().toString(36).slice(2, 8).toUpperCase();

const itemSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, sparse: true, default: makeCode },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    section: { type: String, enum: ["Men", "Women", "Kids"], default: "Women", index: true },
    category: { type: String, required: true, index: true },
    brand: { type: String, required: true, trim: true },
    size: { type: String, required: true, trim: true },
    condition: { type: String, required: true },
    estimatedValue: { type: Number, required: true },
    city: { type: String, required: true, trim: true, index: true },
    state: { type: String, default: "", trim: true },
    images: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["AVAILABLE", "SWAP_PENDING", "SWAPPED", "HIDDEN"],
      default: "AVAILABLE",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);
