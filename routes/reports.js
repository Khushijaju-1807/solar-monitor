// routes/reports.js — reports.html ("Report History", "Download PDF")
// Note: this returns report metadata/history as JSON. Actual PDF file
// generation is a separate step — see the README for how to add it
// (e.g. with the "pdfkit" package) once this is wired up and working.
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/reports — the logged-in owner's report history
router.get("/", requireAuth, (req, res) => {
  const reports = db
    .prepare("SELECT * FROM reports WHERE owner_id = ? ORDER BY generated_on DESC")
    .all(req.user.id);

  res.json({ reports });
});

// POST /api/reports — record that a report was generated (matches "Download PDF" buttons)
router.post("/", requireAuth, (req, res) => {
  const { title, report_type } = req.body;

  if (!title || !report_type) {
    return res.status(400).json({ error: "title and report_type are required." });
  }

  const result = db
    .prepare("INSERT INTO reports (owner_id, title, report_type) VALUES (?, ?, ?)")
    .run(req.user.id, title, report_type);

  const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ report });
});

module.exports = router;
