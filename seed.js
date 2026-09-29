// seed.js — recreates the same demo users/plants/tickets/readings that the
// old SQLite db.js used to auto-seed on first run. Run manually:
//   npm run seed
require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const User = require("./models/User");
const Plant = require("./models/Plant");
const GenerationReading = require("./models/GenerationReading");
const MaintenanceTicket = require("./models/MaintenanceTicket");

async function seed() {
  await connectDB();

  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log("Database already has users — skipping seed. Drop the collections first if you want to reseed.");
    await mongoose.disconnect();
    return;
  }

  // Demo plant-owner accounts are low-stakes (no admin capability), so they
  // keep a fixed password for easy grading/demoing.
  const defaultPassword = bcrypt.hashSync("password123", 10);

  // The admin account is different: admin can delete any user, create more
  // admins, and see every plant. A fixed, publicly-known password for that
  // role is a real hole — anyone who reads this file (or a chat transcript
  // that quoted it) would have standing admin access. So this password is
  // randomly generated every time you seed, never hardcoded, and printed
  // exactly once — right here, right now — for you to save immediately.
  const adminPassword = crypto.randomBytes(9).toString("base64url"); // e.g. "kQ3f9xL2ZpTf1s"
  const adminPasswordHash = bcrypt.hashSync(adminPassword, 10);

  const jane = await User.create({ name: "Jane Doe", email: "khushijaju4@gmail.com", password_hash: defaultPassword, role: "owner", status: "verified" });
  const ravi = await User.create({ name: "Ravi Kulkarni", email: "ravi.k@example.com", password_hash: defaultPassword, role: "owner", status: "verified" });
  const meera = await User.create({ name: "Meera Shah", email: "meera.shah@example.com", password_hash: defaultPassword, role: "owner", status: "pending" });
  await User.create({ name: "Admin User", email: "admin@solarledger.com", password_hash: adminPasswordHash, role: "admin", status: "verified" });

  const janePlant = await Plant.create({ owner_id: jane.id, name: "Rooftop Array — Sector 4", capacity_kw: 10, location: "Ahilyanagar, Maharashtra", installed_on: "2023-03-14", inverter: "Growatt 10kW Hybrid" });
  const raviPlant = await Plant.create({ owner_id: ravi.id, name: "Warehouse Roof — Unit 2", capacity_kw: 18, location: "Pune, Maharashtra", installed_on: "2022-11-02", inverter: "Growatt 20kW Hybrid" });
  await Plant.create({ owner_id: ravi.id, name: "Warehouse Roof — Unit 3", capacity_kw: 12, location: "Pune, Maharashtra", installed_on: "2023-06-20", inverter: "Growatt 15kW Hybrid" });
  const meeraPlant = await Plant.create({ owner_id: meera.id, name: "Residence Rooftop", capacity_kw: 6, location: "Nashik, Maharashtra", installed_on: "2024-01-09", inverter: "Growatt 6kW" });

  await MaintenanceTicket.create({ plant_id: janePlant.id, raised_by: jane.id, issue_type: "inverter", description: "Inverter Fault", technician: "Unassigned", status: "in-progress" });
  await MaintenanceTicket.create({ plant_id: raviPlant.id, raised_by: ravi.id, issue_type: "low-output", description: "Low Output — Cluster B", technician: "Sameer Patil", status: "assigned" });
  await MaintenanceTicket.create({ plant_id: meeraPlant.id, raised_by: meera.id, issue_type: "physical", description: "Physical Damage — Panel 4", technician: "Sameer Patil", status: "closed" });

  const week = [38, 42, 29, 45, 41, 47, 43];
  const today = new Date();
  for (let i = 0; i < week.length; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    await GenerationReading.create({
      plant_id: janePlant.id,
      reading_date: d.toISOString().slice(0, 10),
      kwh: week[i],
    });
  }

  console.log("Seeded database with demo users, plants, and tickets.");
  console.log("Demo plant-owner password (khushijaju4@gmail.com, ravi.k@example.com, meera.shah@example.com): password123");
  console.log("");
  console.log("================================================================");
  console.log(" ADMIN LOGIN — save this now, it will not be shown again:");
  console.log(`   email:    admin@solarledger.com`);
  console.log(`   password: ${adminPassword}`);
  console.log(" Change it once you're logged in (Profile → Change Password).");
  console.log("================================================================");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
