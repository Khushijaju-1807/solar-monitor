// db.js — SQLite database setup, schema, and seed data
const path = require("path");
const bcrypt = require("bcryptjs");
const { DatabaseSync } = require("node:sqlite");

const dbPath = path.join(__dirname, "solarledger.db");
const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  status TEXT NOT NULL DEFAULT 'pending',
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS plants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  capacity_kw REAL,
  location TEXT,
  installed_on TEXT,
  inverter TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS generation_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plant_id INTEGER NOT NULL,
  reading_date TEXT NOT NULL,
  kwh REAL NOT NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plant_id INTEGER NOT NULL,
  raised_by INTEGER NOT NULL,
  issue_type TEXT NOT NULL,
  description TEXT,
  technician TEXT DEFAULT 'Unassigned',
  status TEXT NOT NULL DEFAULT 'assigned',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE,
  FOREIGN KEY (raised_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL,
  generated_on TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;

if (userCount === 0) {
  const insertUser = db.prepare(`INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)`);
  const insertPlant = db.prepare(`INSERT INTO plants (owner_id, name, capacity_kw, location, installed_on, inverter) VALUES (?, ?, ?, ?, ?, ?)`);
  const insertTicket = db.prepare(`INSERT INTO maintenance_tickets (plant_id, raised_by, issue_type, description, technician, status) VALUES (?, ?, ?, ?, ?, ?)`);
  const insertReading = db.prepare(`INSERT INTO generation_readings (plant_id, reading_date, kwh) VALUES (?, ?, ?)`);

  const defaultPassword = bcrypt.hashSync("password123", 10);

  const janeId = insertUser.run("Jane Doe", "khushijaju4@gmail.com", defaultPassword, "owner", "verified").lastInsertRowid;
  const raviId = insertUser.run("Ravi Kulkarni", "ravi.k@example.com", defaultPassword, "owner", "verified").lastInsertRowid;
  const meeraId = insertUser.run("Meera Shah", "meera.shah@example.com", defaultPassword, "owner", "pending").lastInsertRowid;
  insertUser.run("Admin User", "admin@solarledger.com", defaultPassword, "admin", "verified");

  const janePlant = insertPlant.run(janeId, "Rooftop Array — Sector 4", 10, "Ahilyanagar, Maharashtra", "2023-03-14", "Growatt 10kW Hybrid").lastInsertRowid;
  const raviPlant = insertPlant.run(raviId, "Warehouse Roof — Unit 2", 18, "Pune, Maharashtra", "2022-11-02", "Growatt 20kW Hybrid").lastInsertRowid;
  insertPlant.run(raviId, "Warehouse Roof — Unit 3", 12, "Pune, Maharashtra", "2023-06-20", "Growatt 15kW Hybrid");
  const meeraPlant = insertPlant.run(meeraId, "Residence Rooftop", 6, "Nashik, Maharashtra", "2024-01-09", "Growatt 6kW").lastInsertRowid;

  insertTicket.run(janePlant, janeId, "inverter", "Inverter Fault", "Unassigned", "in-progress");
  insertTicket.run(raviPlant, raviId, "low-output", "Low Output — Cluster B", "Sameer Patil", "assigned");
  insertTicket.run(meeraPlant, meeraId, "physical", "Physical Damage — Panel 4", "Sameer Patil", "closed");

  const week = [38, 42, 29, 45, 41, 47, 43];
  const today = new Date();
  week.forEach((kwh, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    insertReading.run(janePlant, d.toISOString().slice(0, 10), kwh);
  });

  console.log("Seeded database with demo users, plants, and tickets.");
  console.log("Demo login password for all seeded accounts: password123");
}

module.exports = db;
