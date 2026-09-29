// routes/users.js — admin/users.html ("User Management")
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Plant = require("../models/Plant");
const GenerationReading = require("../models/GenerationReading");
const MaintenanceTicket = require("../models/MaintenanceTicket");
const Report = require("../models/Report");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/users — admin: list every account, with plant counts
router.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const docs = await User.find().sort({ _id: 1 });

    const users = await Promise.all(
      docs.map(async (u) => {
        const plant_count = await Plant.countDocuments({ owner_id: u.id });
        const json = u.toJSON();
        delete json.password_hash;
        json.plant_count = plant_count;
        return json;
      })
    );

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// POST /api/users — admin: "+ Add User"
router.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { name, email, role, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required." });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "That email is already registered." });

    const password_hash = bcrypt.hashSync(password, 10);
    const user = await User.create({
      name,
      email,
      password_hash,
      role: role === "admin" ? "admin" : "owner",
      status: "verified",
    });

    const json = user.toJSON();
    delete json.password_hash;
    res.status(201).json({ user: json });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id — admin: "Remove"
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "User not found." });

    // cascade: matches the old SQLite ON DELETE CASCADE behavior
    const plants = await Plant.find({ owner_id: req.params.id });
    const plantIds = plants.map((p) => p.id);

    await GenerationReading.deleteMany({ plant_id: { $in: plantIds } });
    await MaintenanceTicket.deleteMany({ plant_id: { $in: plantIds } });
    await Plant.deleteMany({ owner_id: req.params.id });
    await MaintenanceTicket.deleteMany({ raised_by: req.params.id });
    await Report.deleteMany({ owner_id: req.params.id });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
