// routes/users.js — admin/users.html ("User Management")
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/users — admin: list every account, with plant counts
router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const users = db
    .prepare(
      `SELECT users.id, users.name, users.email, users.role, users.status, users.created_at,
              COUNT(plants.id) AS plant_count
       FROM users
       LEFT JOIN plants ON plants.owner_id = users.id
       GROUP BY users.id
       ORDER BY users.id`
    )
    .all();

  res.json({ users });
});

// POST /api/users — admin: "+ Add User"
router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { name, email, role, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "That email is already registered." });

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'verified')`
    )
    .run(name, email, password_hash, role === "admin" ? "admin" : "owner");

  const user = db.prepare("SELECT id, name, email, role, status FROM users WHERE id = ?").get(
    result.lastInsertRowid
  );
  res.status(201).json({ user });
});

// DELETE /api/users/:id — admin: "Remove"
router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "User not found." });
  res.json({ success: true });
});

module.exports = router;
