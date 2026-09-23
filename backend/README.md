# TMO Grading Queue — Backend (NestJS)

Clean Architecture: `controller → use-case → domain → repository`. No ORM —
raw parameterized SQL via `mssql` (tedious driver). See `../SPEC.md` for the
full requirement spec; section numbers are referenced throughout the code
(`// SPEC §2.6` etc.) next to the business rule they implement.

## Setup

```bash
npm install
cp .env.example .env   # fill in a real, TCP-reachable MSSQL server
npm run migrate        # applies migrations/*.sql, tracked in dbo._migrations
npm run seed           # optional: 16 real schools + SPEC §7 test accounts + rotation-seeded queue
npm run start:dev
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run migrate` | Applies `migrations/*.sql` in order (creates the DB if missing) |
| `npm run seed` | Dev/demo data: schools, `admin`/`committee1-5`/`mentor1` (password `password123`), full rotation-generated queue. No-ops if `School` already has rows. |
| `npm run migrate:data -- <path-to-pg_dump.sql>` | SPEC §9 production data migration from the old Postgres backup — see the file's own header comment for the approach and why |
| `npm run build` / `start:dev` / `test` | standard Nest scripts |

## A note on this environment

Development started in a sandbox with SQL Server only available via
**LocalDB** (`(localdb)\MSSQLLocalDB`), which speaks named pipes only —
`mssql`/tedious (the driver SPEC §1.1 specifies) needs TCP. The machine
turned out to also have a full **SQL Server 2019 Developer Edition**
instance installed (service `MSSQLSERVER`), just stopped with TCP/IP
disabled. The user started it and enabled TCP (both needed Administrator
rights this session doesn't have); a SQL login (`tmo_app`, `dbcreator`
server role) was created over the resulting Windows-authenticated
connection so the app could use SQL Authentication.

With that, everything below ran for real, not just against fakes:

- **Schema & seed**: `npm run migrate` and `npm run seed` both ran against live SQL Server — 16 schools, 7 users, 96 students, 80 queue items, counts confirmed via `sqlcmd`.
- **The full API, driven by real HTTP against real data**: login issuing a genuine JWT, `/queue/mine` correctly scoped to one problem number with nested `school.students`, a claim → score submission verified in the DB as `QueueItem.Status = DONE` plus 6 `Score` rows plus 6 paired `AuditLog` rows in one transaction, the public board reflecting it with zero score/judge leakage, the scoring lock blocking direct scoring while still allowing claim, and a score-edit-request create → approve cycle that updated `Score.Value` with its own `AuditLog` row.
- **The queue-claim race condition, under real concurrency**: two different judge accounts fired genuinely concurrent `fetch()` calls at the same `WAITING` item; exactly one got `200`, the other got the exact `409` race-loss message — the atomic `UPDATE ... WHERE Status='WAITING' AND ClaimedByUserId IS NULL` guard holds under real concurrent load against a real server, not just in a single-threaded fake.
- **Business logic (fakes)**: every risky Use Case is also unit-tested against in-memory fake repositories (`src/testing/`, `**/*.spec.ts`) — 47 tests, all passing — since Clean Architecture's whole point is that this layer needs no DB.
- **DI wiring**: `src/app.module.spec.ts` compiles the entire Nest module graph with a stub `DB_POOL`, catching real cross-module provider bugs (it caught one — see git history / `UsersModule`'s `@Global()`).
- **Data migration parser**: `migrate-data.spec.ts` runs the real parser against the actual file in `../backup/`, not a synthetic fixture.

Not yet done: a full click-through of the Next.js frontend against this
live backend, and device-testing `/committee` on an actual tablet (SPEC §8
item 5 flags that as never having been done even in the old system).

**One real bug this caught**: deleting a committee member who still had
`Score`/`AuditLog` history (blocked by `FK_QueueItem_ClaimedByUser` etc.,
`ON DELETE NO ACTION` by design — SPEC §2.1) surfaced as a raw 500 instead
of a clean error. Fixed in `ManageCommitteeUseCase.remove()` to catch SQL
error 547 and return a proper Thai `409`. This is exactly the kind of thing
unit tests against fakes can't catch, since the fake repositories don't
enforce real FK constraints — a good argument for the `sqlcmd`/live-DB pass
being worth doing at least once.

## Layout

```
migrations/            .sql files, numbered, tracked in dbo._migrations
src/
  auth/                 JWT issuing + login (SPEC §2.2)
  common/                guards, decorators, CSV/error helpers shared across modules
  database/              connection pool, TransactionRunner (SPEC §1.4), migration/seed CLIs
  domain/                entity types (School, User, QueueItem, Score, ...)
  modules/
    queue/                claim/release/score/public-board — the highest-risk logic
    scores/, settings/, audit-log/, committee/, schools/, students/, users/
    admin/                admin-only CRUD controllers + use-cases (schools/committee/queue/students/scores/settings/audit-log/dashboard)
    mentor/, schedule/     scoped export endpoints
    realtime/              SSE (ready/changed/ping), SPEC §2.3
  testing/                fake in-memory repositories for Use Case unit tests
```
