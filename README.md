# TMO Grading Queue — Rewrite

Full rewrite per [SPEC.md](SPEC.md) and [PROMPT.md](PROMPT.md). Two apps, one repo:

- [backend/](backend/) — NestJS API, Clean Architecture, raw SQL via `mssql` (no ORM). Start here: [backend/README.md](backend/README.md).
- [frontend/](frontend/) — Next.js 16 App Router, BFF pattern. Start here: [frontend/README.md](frontend/README.md).
- [backup/](backup/) — the old system's production data (PostgreSQL `pg_dump`). Migrated into the new MSSQL schema by `backend/src/database/migrate-data.ts` (SPEC §9).

## Decisions made with you before writing the schema (SPEC §8 / PROMPT.md §3)

- **Score unique key** kept as `(StudentId, QueueItemId)` — no multi-judge averaging support. A later judge's write overwrites an earlier one, unchanged from the old system.
- **No rubric sub-scores** — one 0–10 value per student per problem, matching SPEC exactly.
- **No separate API token scheme** — JWT-via-cookie only, no machine-to-machine key.
- **Watermark added** to authenticated screens and exports (the old system had one, then dropped it — SPEC asked to reconsider; this rewrite keeps it).

## Quickstart

```bash
# 1. Schema
cd backend && cp .env.example .env   # point at a real, TCP-reachable MSSQL server
npm install && npm run migrate

# 2. Data — either demo data or the real backup
npm run seed                                          # demo: 16 real schools, SPEC §7 test accounts, full rotation queue
npm run migrate:data -- ../backup/tmo_db_backup_*.sql  # OR: the real production backup

# 3. Backend
npm run start:dev   # http://localhost:4000

# 4. Frontend (separate terminal)
cd ../frontend && cp .env.example .env.local
npm install && npm run dev   # http://localhost:3000
```

## Demo accounts (created by `npm run seed`)

Every seeded account uses the password **`password123`**. Log in at `/login`; each role is redirected to its own home page.

| Username | Role | Lands on | Scope / what it can do |
|---|---|---|---|
| `admin` | ADMIN | `/admin` | Everything administrative: schools, students, queue, users & permissions (incl. signature upload), scores, audit log, lock scoring |
| `committee1` … `committee5` | COMMITTEE | `/committee` | Claims and scores queue items for **its own problem number** (committee*N* → problem *N*), all schools; read-only scoreboard |
| `staff1` | STAFF | `/staff` | Delegated examiner for **problem 1**, all schools: Call Next / Skip / Return / Mark Complete, under its own identity |
| `team-leader1` | TEAM_LEADER | `/team-leader` | Belongs to the **first seeded school**: views its scores, approves score sets (e-signature + PDF), reviews score-edit requests |

Notes:

- **Approving needs signatures.** Before a Team Leader can approve, an admin must upload a signature image for both the judge who submitted (`committee*`/`staff1`) and the team leader: `/admin/committee` → "อัปโหลดลายเซ็น" (PNG/JPEG).
- **Roles are strict.** Opening another role's page redirects you to your own home; the backend re-checks the role on every request regardless.
- **Changing roles.** Admins can create/delete Team Leaders and switch a user between Committee / Staff / Team Leader from `/admin/committee` (ADMIN accounts are DB-only on purpose). You can also set `[User].Role` directly in SQL — the API reads the role from the DB on every request — but then also fix the scope (`UserAssignment` rows for Committee/Staff, `User.SchoolId` for Team Leader).
- **These accounts exist only after `npm run seed`.** With the real backup (`npm run migrate:data`) the users are whatever the old system had — use those credentials, and note that the old `MENTOR` accounts become `TEAM_LEADER`. Change the demo password before any non-local deployment.

## What's verified

Initially built in a sandbox that only had SQL Server's named-pipe-only
LocalDB, which the `mssql`/tedious driver SPEC mandates can't reach — but
the machine turned out to also have a full **SQL Server 2019 Developer
Edition** instance installed, just stopped and with TCP/IP disabled. With
the user's help starting the service and flipping the TCP registry flag
(both required Administrator rights this session doesn't have), the
backend was connected to a **real, TCP-reachable SQL Server** and exercised
live — not just against fakes:

| Layer | How it was verified |
| --- | --- |
| DB schema | `npm run migrate` applied for real against live SQL Server; `sqlcmd` confirmed CHECK/UNIQUE/FK behavior with live inserts |
| Seed data | `npm run seed` ran for real: 16 schools, 7 users, 96 students, 80 queue items (exactly 16×5, one rotation slot each) — counts confirmed via `sqlcmd` |
| Business logic (fakes) | 47 Jest unit tests against in-memory fake repositories, covering every risky rule SPEC §8.6 names by name |
| Business logic (real DB, real HTTP) | The backend was started (`npm run start:prod`) against the live database and driven with real `curl`/`fetch` calls: login issuing a real JWT, `/queue/mine` correctly scoped to one problem number with nested `school.students`, a full claim→score submission confirmed in the DB as `QueueItem.Status=DONE` + 6 `Score` rows + 6 paired `AuditLog` rows in one transaction, the public board showing the update with zero score/judge leakage, the scoring lock blocking direct scoring but not claiming, and a full score-edit-request create→approve cycle updating `Score.Value` with its own `AuditLog` row |
| **The queue-claim race condition, for real** | Two genuinely concurrent `fetch()` calls from two different judge accounts hit the same `WAITING` item's claim endpoint at once against the live database — exactly one won (`200`), the other got back the precise race-loss message (`409`, "รายการนี้ถูกกรรมการท่านอื่นรับตรวจไปแล้ว"), proving the atomic `UPDATE ... WHERE Status='WAITING' AND ClaimedByUserId IS NULL` guard holds under real concurrent load, not just in a single-threaded fake |
| DI wiring | A dedicated test compiles the *entire* Nest module graph with a stubbed DB pool — caught and fixed a real cross-module bug during development |
| Data migration parser | Run against the actual file in `backup/`, not a synthetic fixture — confirmed it finds all 16 real schools, 5 committee assignments, etc. |
| Frontend | `next build` + `eslint` clean across all 18 routes; the `/admin` → `/login?callbackUrl=...` redirect was exercised in a real browser; both light and dark `prefers-color-scheme` checked visually |
| Frontend ↔ real backend, full click-through | **Not yet done** — the frontend dev server wasn't driven through a full login+claim+score click-through against the now-live backend |

Still worth doing before go-live: a real click-through of the Next.js UI
against this live backend for all three roles, and testing `/committee` on
an actual tablet — SPEC §8 item 5 flags that as never having been done even
in the old system.
