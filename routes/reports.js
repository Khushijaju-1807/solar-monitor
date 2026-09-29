// routes/reports.js — reports.html ("Report History", "Download PDF")
// History as JSON, plus GET /:id/pdf which builds the actual PDF (pdfkit).
const express = require("express");
const mongoose = require("mongoose");
const Report = require("../models/Report");
const User = require("../models/User");
const Plant = require("../models/Plant");
const GenerationReading = require("../models/GenerationReading");
const MaintenanceTicket = require("../models/MaintenanceTicket");
const { buildReport } = require("../utils/reportPdf");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/reports — the logged-in owner's report history
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const docs = await Report.find({ owner_id: req.user.id }).sort({ generated_on: -1 });
    res.json({ reports: docs.map((r) => r.toJSON()) });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/all — admin only: every owner's report history (fleet-wide)
router.get("/all", requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required." });

    const docs = await Report.find().sort({ generated_on: -1 });
    const ownerIds = [...new Set(docs.map((r) => String(r.owner_id)))];
    const owners = await User.find({ _id: { $in: ownerIds } });
    const byId = {};
    owners.forEach((o) => { byId[o.id] = o; });

    res.json({
      reports: docs.map((r) => {
        const o = byId[String(r.owner_id)];
        return { ...r.toJSON(), owner_name: o ? o.name : "Unknown", owner_email: o ? o.email : "-" };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/reports — record that a report was generated (matches "Download PDF" buttons)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, report_type } = req.body;

    if (!title || !report_type) {
      return res.status(400).json({ error: "title and report_type are required." });
    }

    const report = await Report.create({
      owner_id: req.user.id,
      title,
      report_type,
    });

    res.status(201).json({ report: report.toJSON() });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/:id/pdf — generate and download the PDF for one report
router.get("/:id/pdf", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Report not found." });
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found." });
    if (req.user.role !== "admin" && report.owner_id.toString() !== req.user.id) {
      return res.status(403).json({ error: "You don't have access to this report." });
    }

    const owner = await User.findById(report.owner_id);
    if (!owner) return res.status(404).json({ error: "Report owner not found." });

    const annual = report.report_type === "annual";
    const days = annual ? 365 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const plantDocs = await Plant.find({ owner_id: owner.id }).sort({ _id: 1 });
    const plants = [];
    for (const p of plantDocs) {
      const readings = await GenerationReading.find({ plant_id: p.id, reading_date: { $gte: sinceStr } }).sort({ reading_date: 1 });
      let series;
      if (annual) {
        const byMonth = {};
        readings.forEach((r) => { const k = r.reading_date.slice(0, 7); byMonth[k] = (byMonth[k] || 0) + r.kwh; });
        series = Object.keys(byMonth).sort().map((k) => ({ label: k, kwh: byMonth[k] }));
      } else {
        series = readings.map((r) => ({ label: r.reading_date.slice(5), kwh: r.kwh }));
      }
      const total = series.reduce((a, s) => a + s.kwh, 0);
      plants.push({
        name: p.name, location: p.location, capacity_kw: p.capacity_kw, inverter: p.inverter, installed_on: p.installed_on,
        series, total, avg: series.length ? total / series.length : 0, peak: series.length ? Math.max(...series.map((s) => s.kwh)) : 0,
      });
    }

    const ticketDocs = await MaintenanceTicket.find({ raised_by: owner.id }).populate("plant_id", "name").sort({ created_at: -1 });
    const tickets = ticketDocs.map((t) => ({
      issue: t.description || t.issue_type, plant: t.plant_id ? t.plant_id.name : "-",
      technician: t.technician || "Unassigned", status: t.status, date: t.created_at,
    }));

    const safe = report.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "report";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safe}.pdf"`);
    buildReport(res, {
      title: report.title, generatedOn: report.generated_on, owner: { name: owner.name, email: owner.email },
      periodLabel: annual ? "Last 12 months" : "Last 30 days", unit: annual ? "month" : "day", plants, tickets,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;