require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const [email, newPassword] = process.argv.slice(2);

(async () => {
  try {
    if (!email || !newPassword) throw new Error('Usage: node set-password.js admin@seed.swap  "<new password>"');
    if (newPassword.length < 8) throw new Error("Use at least 8 characters.");

    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new Error("No user found with that email.");

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    console.log(`Password updated for ${user.email}.`);
  } catch (err) {
    console.error("Failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
})();