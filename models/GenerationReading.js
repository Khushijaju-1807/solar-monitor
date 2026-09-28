// models/GenerationReading.js — matches the old SQLite "generation_readings" table
const mongoose = require("mongoose");

const generationReadingSchema = new mongoose.Schema(
  {
    plant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Plant", required: true },
    reading_date: { type: String, required: true }, // stored as YYYY-MM-DD, same as before
    kwh: { type: Number, required: true },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.plant_id = ret.plant_id?.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

module.exports = mongoose.model("GenerationReading", generationReadingSchema);
