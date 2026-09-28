// models/MaintenanceTicket.js — matches the old SQLite "maintenance_tickets" table
const mongoose = require("mongoose");

const maintenanceTicketSchema = new mongoose.Schema(
  {
    plant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Plant", required: true },
    raised_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    issue_type: { type: String, required: true },
    description: { type: String, default: null },
    technician: { type: String, default: "Unassigned" },
    status: { type: String, default: "assigned" },
    created_at: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.plant_id = ret.plant_id?.toString();
        ret.raised_by = ret.raised_by?.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

module.exports = mongoose.model("MaintenanceTicket", maintenanceTicketSchema);
