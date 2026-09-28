// server.js — SolarLedger backend entry point
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
connectDB(); // connects to MongoDB Atlas via MONGODB_URI

const authRoutes = require("./routes/auth");
const plantsRoutes = require("./routes/plants");
const maintenanceRoutes = require("./routes/maintenance");
const usersRoutes = require("./routes/users");
const reportsRoutes = require("./routes/reports");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Solar Monitor Backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/plants", plantsRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/reports", reportsRoutes);

// Catch-all error handler so the server never crashes silently
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});