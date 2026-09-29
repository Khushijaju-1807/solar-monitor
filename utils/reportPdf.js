// utils/reportPdf.js — builds the PDF report and streams it to the response.
const PDFDocument = require("pdfkit");

const NAVY = "#0B1F3A";
const AMBER = "#F4A623";
const GREY = "#5B6B82";

function fmtDate(v) {
  const d = new Date(v);
  return isNaN(d) ? "-" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - 60) doc.addPage();
}

function heading(doc, text) {
  ensureSpace(doc, 40);
  doc.moveDown(0.8).font("Helvetica-Bold").fontSize(13).fillColor(NAVY).text(text);
  const y = doc.y + 2;
  doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y)
    .lineWidth(1.5).strokeColor(AMBER).stroke();
  doc.moveDown(0.6).fillColor("black");
}

function barChart(doc, series, unitLabel) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const height = 110;
  ensureSpace(doc, height + 40);
  const top = doc.y + 6;
  const max = Math.max(...series.map((s) => s.kwh), 1);
  doc.moveTo(left, top + height).lineTo(left + width, top + height).lineWidth(0.5).strokeColor("#999999").stroke();
  const slot = width / series.length;
  const barW = Math.max(2, slot * 0.6);
  series.forEach((s, i) => {
    const h = (s.kwh / max) * (height - 10);
    doc.rect(left + i * slot + (slot - barW) / 2, top + height - h, barW, h).fill(NAVY);
  });
  doc.font("Helvetica").fontSize(7).fillColor(GREY);
  const step = Math.max(1, Math.ceil(series.length / 8));
  series.forEach((s, i) => {
    if (i % step === 0) doc.text(s.label, left + i * slot - 6, top + height + 3, { width: slot * step, lineBreak: false });
  });
  doc.text(`Peak ${max.toFixed(1)} ${unitLabel}`, left, top - 2, { width, align: "right", lineBreak: false });
  doc.y = top + height + 20;
  doc.x = left;
  doc.fillColor("black");
}

function tableRow(doc, cols, widths, bold) {
  ensureSpace(doc, 20);
  const y = doc.y;
  let x = doc.page.margins.left;
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(bold ? NAVY : "black");
  cols.forEach((c, i) => { doc.text(String(c), x, y, { width: widths[i] - 6, lineBreak: false, ellipsis: true }); x += widths[i]; });
  doc.y = y + 16;
  doc.x = doc.page.margins.left;
}

function buildReport(res, data) {
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true, info: { Title: data.title, Author: "SolarLedger" } });
  doc.pipe(res);

  // Header band
  doc.rect(0, 0, doc.page.width, 90).fill(NAVY);
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#FFFFFF").text("SolarLedger", 50, 26);
  doc.font("Helvetica").fontSize(11).fillColor(AMBER).text(data.title, 50, 56);
  doc.y = 110; doc.x = 50; doc.fillColor("black");

  doc.font("Helvetica").fontSize(10).fillColor(GREY);
  doc.text(`Prepared for: ${data.owner.name} (${data.owner.email})`);
  doc.text(`Period: ${data.periodLabel}`);
  doc.text(`Generated on: ${fmtDate(data.generatedOn)}`);

  const totalKwh = data.plants.reduce((a, p) => a + p.total, 0);
  const openTickets = data.tickets.filter((t) => t.status !== "closed").length;

  heading(doc, "Summary");
  doc.font("Helvetica").fontSize(10.5).fillColor("black");
  doc.text(`Plants: ${data.plants.length}`);
  doc.text(`Total energy generated: ${totalKwh.toFixed(1)} kWh`);
  doc.text(`Maintenance requests: ${data.tickets.length} (${openTickets} open)`);

  data.plants.forEach((p) => {
    heading(doc, `Plant: ${p.name}`);
    doc.font("Helvetica").fontSize(10).fillColor("black");
    doc.text(`Location: ${p.location || "-"}    Capacity: ${p.capacity_kw ? p.capacity_kw + " kW" : "-"}    Inverter: ${p.inverter || "-"}`);
    doc.text(`Installed on: ${p.installed_on || "-"}`);
    doc.moveDown(0.4);
    if (!p.series.length) {
      doc.fillColor(GREY).text("No generation readings recorded for this period.").fillColor("black");
    } else {
      doc.text(`Total: ${p.total.toFixed(1)} kWh    Average: ${p.avg.toFixed(1)} kWh per ${data.unit}    Best ${data.unit}: ${p.peak.toFixed(1)} kWh`);
      barChart(doc, p.series, "kWh");
    }
  });

  heading(doc, "Maintenance Requests");
  if (!data.tickets.length) {
    doc.font("Helvetica").fontSize(10).fillColor(GREY).text("No maintenance requests raised.").fillColor("black");
  } else {
    const w = [150, 110, 90, 70, 70];
    tableRow(doc, ["Issue", "Plant", "Technician", "Status", "Raised"], w, true);
    data.tickets.forEach((t) => tableRow(doc, [t.issue, t.plant, t.technician, t.status, fmtDate(t.date)], w, false));
  }

  // Page numbers
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0; // footer sits in the margin; without this pdfkit adds a blank page
    doc.font("Helvetica").fontSize(8).fillColor(GREY)
      .text(`SolarLedger | Page ${i + 1} of ${range.count}`, 50, doc.page.height - 40, { width: doc.page.width - 100, align: "center", lineBreak: false });
  }
  doc.end();
}

module.exports = { buildReport };
