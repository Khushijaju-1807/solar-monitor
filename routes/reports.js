// routes/reports.js — reports.html ("Report History", "Download PDF")
// Note: this returns report metadata/history as JSON. Actual PDF file
// generation is a separate step — see the README for how to add it
// (e.g. with the "pdfkit" package) once this is wired up and working.
const express = require("express");
const Report = require("../models/Report");
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

module.exports = router;