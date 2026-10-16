const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    suspended: { type: Boolean, default: false },
    phone: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);