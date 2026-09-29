// routes/plants.js — plant details + generation analytics (dashboard.html)
const express = require("express");
const Plant = require("../models/Plant");
const GenerationReading = require("../models/GenerationReading");
const MaintenanceTicket = require("../models/MaintenanceTicket");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/plants — the logged-in owner's plants (admins get all plants)
router.get("/", requireAuth, async (req, res, next) => {
  try {
    let plants;
    if (req.user.role === "admin") {
      const docs = await Plant.find().populate("owner_id", "name").sort({ _id: 1 });
      plants = docs.map((p) => {
        const json = p.toJSON();
        json.owner_name = p.owner_id?.name;
        json.owner_id = p.owner_id?._id?.toString() ?? json.owner_id;
        return json;
      });
    } else {
      const docs = await Plant.find({ owner_id: req.user.id }).sort({ _id: 1 });
      plants = docs.map((p) => p.toJSON());
    }

    res.json({ plants });
  } catch (err) {
    next(err);
  }
});

// GET /api/plants/:id/generation?range=week|month|year — feeds the Chart.js graph
router.get("/:id/generation", requireAuth, async (req, res, next) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) return res.status(404).json({ error: "Plant not found." });
    if (req.user.role !== "admin" && plant.owner_id.toString() !== req.user.id) {
      return res.status(403).json({ error: "You don't have access to this plant." });
    }

    const range = req.query.range || "week";
    const days = range === "year" ? 365 : range === "month" ? 30 : 7;

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const readings = await GenerationReading.find({
      plant_id: plant.id,
      reading_date: { $gte: sinceStr },
    })
      .sort({ reading_date: 1 })
      .select("reading_date kwh -_id");

    res.json({ range, readings });
  } catch (err) {
    next(err);
  }
});

// POST /api/plants — admin registers a new plant (admin/plants.html)
router.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { owner_id, name, capacity_kw, location, installed_on, inverter } = req.body;

    if (!owner_id || !name) {
      return res.status(400).json({ error: "owner_id and name are required." });
    }

    const plant = await Plant.create({
      owner_id,
      name,
      capacity_kw: capacity_kw || null,
      location: location || null,
      installed_on: installed_on || null,
      inverter: inverter || null,
    });

    res.status(201).json({ plant: plant.toJSON() });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/plants/:id — admin removes a plant
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const deleted = await Plant.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Plant not found." });

    // cascade: matches the old SQLite ON DELETE CASCADE behavior
    await GenerationReading.deleteMany({ plant_id: req.params.id });
    await MaintenanceTicket.deleteMany({ plant_id: req.params.id });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
