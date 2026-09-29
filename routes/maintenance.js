// routes/maintenance.js — maintenance.html + admin/maintenance.html
const express = require("express");
const MaintenanceTicket = require("../models/MaintenanceTicket");
const Plant = require("../models/Plant");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/maintenance — owner sees their own tickets, admin sees all
router.get("/", requireAuth, async (req, res, next) => {
  try {
    let tickets;

    if (req.user.role === "admin") {
      const docs = await MaintenanceTicket.find()
        .populate("raised_by", "name")
        .populate("plant_id", "name")
        .sort({ created_at: -1 });

      tickets = docs.map((t) => {
        const json = t.toJSON();
        json.raised_by_name = t.raised_by?.name;
        json.plant_name = t.plant_id?.name;
        json.raised_by = t.raised_by?._id?.toString() ?? json.raised_by;
        json.plant_id = t.plant_id?._id?.toString() ?? json.plant_id;
        return json;
      });
    } else {
      const docs = await MaintenanceTicket.find({ raised_by: req.user.id })
        .populate("plant_id", "name")
        .sort({ created_at: -1 });

      tickets = docs.map((t) => {
        const json = t.toJSON();
        json.plant_name = t.plant_id?.name;
        json.plant_id = t.plant_id?._id?.toString() ?? json.plant_id;
        return json;
      });
    }

    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

// POST /api/maintenance — matches maintenance.html "Raise a Request" form
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { plant_id, issue_type, description } = req.body;

    if (!issue_type || !description) {
      return res.status(400).json({ error: "Please select an issue type and add a description." });
    }

    // If no plant_id sent, default to the user's first plant
    let resolvedPlantId = plant_id;
    if (!resolvedPlantId) {
      const firstPlant = await Plant.findOne({ owner_id: req.user.id });
      if (!firstPlant) return res.status(400).json({ error: "You don't have a plant on file yet." });
      resolvedPlantId = firstPlant.id;
    }

    const ticket = await MaintenanceTicket.create({
      plant_id: resolvedPlantId,
      raised_by: req.user.id,
      issue_type,
      description,
      technician: "Unassigned",
      status: "assigned",
    });

    res.status(201).json({ ticket: ticket.toJSON() });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/maintenance/:id — admin updates status / technician (admin/maintenance.html dropdown)
router.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status, technician } = req.body;

    const update = {};
    if (status) update.status = status;
    if (technician) update.technician = technician;

    const updated = await MaintenanceTicket.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ error: "Ticket not found." });

    res.json({ ticket: updated.toJSON() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
