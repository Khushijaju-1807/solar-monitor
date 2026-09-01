// routes/plants.js — plant details + generation analytics (dashboard.html)
const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/plants — the logged-in owner's plants (admins get all plants)
router.get("/", requireAuth, (req, res) => {
  const plants =
    req.user.role === "admin"
      ? db
          .prepare(
            `SELECT plants.*, users.name AS owner_name
             FROM plants JOIN users ON users.id = plants.owner_id
             ORDER BY plants.id`
          )
          .all()
      : db.prepare("SELECT * FROM plants WHERE owner_id = ? ORDER BY id").all(req.user.id);

  res.json({ plants });
});

// GET /api/plants/:id/generation?range=week|month|year — feeds the Chart.js graph
router.get("/:id/generation", requireAuth, (req, res) => {
  const plant = db.prepare("SELECT * FROM plants WHERE id = ?").get(req.params.id);
  if (!plant) return res.status(404).json({ error: "Plant not found." });
  if (req.user.role !== "admin" && plant.owner_id !== req.user.id) {
    return res.status(403).json({ error: "You don't have access to this plant." });
  }

  const range = req.query.range || "week";
  const days = range === "year" ? 365 : range === "month" ? 30 : 7;

  const readings = db
    .prepare(
      `SELECT reading_date, kwh FROM generation_readings
       WHERE plant_id = ? AND reading_date >= date('now', ?)
       ORDER BY reading_date`
    )
    .all(plant.id, `-${days} days`);

  res.json({ range, readings });
});

// POST /api/plants — admin registers a new plant (admin/plants.html)
router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { owner_id, name, capacity_kw, location, installed_on, inverter } = req.body;

  if (!owner_id || !name) {
    return res.status(400).json({ error: "owner_id and name are required." });
  }

  const result = db
    .prepare(
      `INSERT INTO plants (owner_id, name, capacity_kw, location, installed_on, inverter)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(owner_id, name, capacity_kw || null, location || null, installed_on || null, inverter || null);

  const plant = db.prepare("SELECT * FROM plants WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ plant });
});

// DELETE /api/plants/:id — admin removes a plant
router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const result = db.prepare("DELETE FROM plants WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Plant not found." });
  res.json({ success: true });
});

module.exports = router;
