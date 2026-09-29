// routes/auth.js — register, login, and "who am I"
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function publicUser(user) {
  const json = user.toJSON();
  delete json.password_hash;
  return json;
}

// POST /api/auth/register  — matches register.html fields: name, email, password
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Please fill in all fields." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const password_hash = bcrypt.hashSync(password, 10);

    const user = await User.create({
      name,
      email,
      password_hash,
      role: "owner",
      status: "pending",
    });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login — matches login.html fields: email, password, role
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Please fill in both fields." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — returns the logged-in user (used to fill profile.html etc.)
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/me — matches profile.html "Save Changes"
router.put("/me", requireAuth, async (req, res, next) => {
  try {
    const { fullName, email, phone } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: "Name and email cannot be empty." });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name: fullName, email, phone: phone || null },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/password — change your own password (profile.html "Change Password")
router.put("/password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Please fill in both password fields." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const valid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    user.password_hash = bcrypt.hashSync(newPassword, 10);
    await user.save();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
