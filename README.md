# SolarLedger Backend

A complete Express + SQLite backend for the SolarLedger frontend. It uses
a real file-based database (`solarledger.db`) that's created automatically
the first time you run the server — no separate database server to install.

## 1. Install

```bash
cd backend
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

Open `.env` and set `JWT_SECRET` to any long random string (this signs
login tokens — keep it secret, never commit `.env` to Git).

## 3. Run

```bash
npm start
```

You should see:
```
Backend running on http://localhost:5000
Seeded database with demo users, plants, and tickets.
Demo login password for all seeded accounts: password123
```

`solarledger.db` now exists in the `backend/` folder — that's your database.

## 4. Demo accounts (pre-seeded, matching your screenshots)

| Email                        | Role  | Password    |
|-------------------------------|-------|-------------|
| khushijaju4@gmail.com         | owner | password123 |
| ravi.k@example.com            | owner | password123 |
| meera.shah@example.com        | owner | password123 |
| admin@solarledger.com         | admin | password123 |

## 5. API overview

| Method | Endpoint                     | Who          | Purpose |
|--------|-------------------------------|--------------|---------|
| POST   | /api/auth/register             | public       | register.html |
| POST   | /api/auth/login                | public       | login.html — returns a token |
| GET    | /api/auth/me                   | logged in    | profile.html |
| PUT    | /api/auth/me                   | logged in    | profile.html "Save Changes" |
| GET    | /api/plants                    | logged in    | dashboard.html plant details |
| GET    | /api/plants/:id/generation      | logged in    | dashboard.html chart |
| POST   | /api/plants                    | admin        | admin/plants.html |
| DELETE | /api/plants/:id                | admin        | admin/plants.html |
| GET    | /api/maintenance                | logged in    | maintenance.html |
| POST   | /api/maintenance                | logged in    | maintenance.html "Submit Request" |
| PATCH  | /api/maintenance/:id            | admin        | admin/maintenance.html status dropdown |
| GET    | /api/users                     | admin        | admin/users.html |
| POST   | /api/users                     | admin        | admin/users.html "+ Add User" |
| DELETE | /api/users/:id                 | admin        | admin/users.html "Remove" |
| GET    | /api/reports                    | logged in    | reports.html history |
| POST   | /api/reports                    | logged in    | reports.html "Download PDF" |

Every route except register/login expects a header:
```
Authorization: Bearer <token>
```
The token comes back from `/api/auth/login` — save it (e.g. in a JS
variable or `sessionStorage` on the frontend, not localStorage if you
want it cleared when the tab closes) and attach it to every later request.

## 6. Next steps once this is running

- Update `script.js` to call these endpoints with `fetch()` instead of
  the current placeholder redirects/alerts (I can write that for you —
  just ask).
- Reports currently return JSON metadata, not real PDF files. Once
  everything above works, add the `pdfkit` package to generate and
  stream actual PDFs from `/api/reports`.
- For production, swap SQLite for a hosted database (e.g. Postgres on
  Render/Railway) if you expect many concurrent users — SQLite is fine
  for development and small deployments.
