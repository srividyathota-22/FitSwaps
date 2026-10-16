const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

const makeToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  city: u.city,
  state: u.state,
  role: u.role,
  phone: u.phone,
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, city, state } = req.body;

    if (!name || name.trim().length < 2)
      return res.status(400).json({ message: "Name must be at least 2 characters." });
    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      return res.status(400).json({ message: "Enter a valid email address." });
    if (!password || password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    if (!city || !city.trim())
      return res.status(400).json({ message: "City is required." });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(409).json({ message: "An account with this email already exists." });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, city, state });

    res.status(201).json({ token: makeToken(user._id), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email: email.toLowerCase() });
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) return res.status(401).json({ message: "Incorrect email or password." });
    if (user.suspended) return res.status(403).json({ message: "Your account has been suspended." });

    res.json({ token: makeToken(user._id), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.get("/me", auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, city, state, phone } = req.body;
    if (!name || name.trim().length < 2)
      return res.status(400).json({ message: "Name must be at least 2 characters." });
    if (!city || !city.trim())
      return res.status(400).json({ message: "City is required." });
    if (phone && !/^[0-9+\-\s]{7,15}$/.test(phone.trim()))
      return res.status(400).json({ message: "Enter a valid phone number." });

    req.user.name = name.trim();
    req.user.city = city.trim();
    req.user.state = (state || "").trim();
    req.user.phone = (phone || "").trim();
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  } catch {
    res.status(500).json({ message: "Could not update your profile." });
  }
});

module.exports = router;