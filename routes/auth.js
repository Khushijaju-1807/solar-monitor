// routes/auth.js — register, login, and "who am I"
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
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
  const { password_hash, ...rest } = user;
  return rest;
}

// POST /api/auth/register  — matches register.html fields: name, email, password
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Please fill in all fields." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES (?, ?, ?, 'owner', 'pending')`
    )
    .run(name, email, password_hash);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
  const token = signToken(user);

  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login — matches login.html fields: email, password, role
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Please fill in both fields." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me — returns the logged-in user (used to fill profile.html etc.)
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: publicUser(user) });
});

// PUT /api/auth/me — matches profile.html "Save Changes"
router.put("/me", requireAuth, (req, res) => {
  const { fullName, email, phone } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ error: "Name and email cannot be empty." });
  }

  db.prepare("UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?").run(
    fullName,
    email,
    phone || null,
    req.user.id
  );

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  res.json({ user: publicUser(user) });
});

module.exports = router;
