// routes/maintenance.js — maintenance.html + admin/maintenance.html
const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/maintenance — owner sees their own tickets, admin sees all
router.get("/", requireAuth, (req, res) => {
  const tickets =
    req.user.role === "admin"
      ? db
          .prepare(
            `SELECT maintenance_tickets.*, users.name AS raised_by_name, plants.name AS plant_name
             FROM maintenance_tickets
             JOIN users ON users.id = maintenance_tickets.raised_by
             JOIN plants ON plants.id = maintenance_tickets.plant_id
             ORDER BY maintenance_tickets.created_at DESC`
          )
          .all()
      : db
          .prepare(
            `SELECT maintenance_tickets.*, plants.name AS plant_name
             FROM maintenance_tickets
             JOIN plants ON plants.id = maintenance_tickets.plant_id
             WHERE raised_by = ?
             ORDER BY maintenance_tickets.created_at DESC`
          )
          .all(req.user.id);

  res.json({ tickets });
});

// POST /api/maintenance — matches maintenance.html "Raise a Request" form
router.post("/", requireAuth, (req, res) => {
  const { plant_id, issue_type, description } = req.body;

  if (!issue_type || !description) {
    return res.status(400).json({ error: "Please select an issue type and add a description." });
  }

  // If no plant_id sent, default to the user's first plant
  let resolvedPlantId = plant_id;
  if (!resolvedPlantId) {
    const firstPlant = db.prepare("SELECT id FROM plants WHERE owner_id = ? LIMIT 1").get(req.user.id);
    if (!firstPlant) return res.status(400).json({ error: "You don't have a plant on file yet." });
    resolvedPlantId = firstPlant.id;
  }

  const result = db
    .prepare(
      `INSERT INTO maintenance_tickets (plant_id, raised_by, issue_type, description, technician, status)
       VALUES (?, ?, ?, ?, 'Unassigned', 'assigned')`
    )
    .run(resolvedPlantId, req.user.id, issue_type, description);

  const ticket = db.prepare("SELECT * FROM maintenance_tickets WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ ticket });
});

// PATCH /api/maintenance/:id — admin updates status / technician (admin/maintenance.html dropdown)
router.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { status, technician } = req.body;
  const ticket = db.prepare("SELECT * FROM maintenance_tickets WHERE id = ?").get(req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });

  db.prepare(
    "UPDATE maintenance_tickets SET status = COALESCE(?, status), technician = COALESCE(?, technician) WHERE id = ?"
  ).run(status || null, technician || null, req.params.id);

  const updated = db.prepare("SELECT * FROM maintenance_tickets WHERE id = ?").get(req.params.id);
  res.json({ ticket: updated });
});

module.exports = router;
