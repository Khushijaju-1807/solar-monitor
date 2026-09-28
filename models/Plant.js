// models/Plant.js — matches the old SQLite "plants" table
const mongoose = require("mongoose");

const plantSchema = new mongoose.Schema(
  {
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    capacity_kw: { type: Number, default: null },
    location: { type: String, default: null },
    installed_on: { type: String, default: null },
    inverter: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.owner_id = ret.owner_id?.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

module.exports = mongoose.model("Plant", plantSchema);
