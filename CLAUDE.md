# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read this file in full before creating or editing `.claude/settings.json`** (permissions, hooks, etc.) — settings should respect the architecture and constraints documented here, not just the immediate task.

## What this is

A from-scratch rewrite of "TMO Grading Queue" (ระบบจัดการคิวตรวจข้อสอบ for a math olympiad), built strictly per [SPEC.md](SPEC.md) (the full requirement spec — schema, API contract, business rules, design system, all in Thai) and [PROMPT.md](PROMPT.md) (the instructions that drove the build). **SPEC.md is the source of truth for business behavior** — when in doubt about how something should behave, check it before guessing, and reference its section numbers (`§2.6` etc.) in code comments/commits when implementing a rule from it, matching the existing style.

Two independent apps in one repo, no shared code between them:

- `backend/` — NestJS API, Clean Architecture, no ORM.
- `frontend/` — Next.js 16 App Router, BFF pattern, no direct DB access.
- `backup/` — old system's production data (PostgreSQL `pg_dump`), consumed by `backend/src/database/migrate-data.ts`.

Read [README.md](README.md) for the pre-build decisions that shaped the schema (score unique key has no multi-judge support, no rubric sub-scores, JWT-only auth, watermark kept). Read `backend/README.md` and `frontend/README.md` for what has and hasn't been verified against a real environment — both note real gaps (no full frontend↔live-backend click-through yet, no tablet testing of `/committee`).

## Commands

### Backend (`backend/`)

```bash
npm run migrate                              # apply migrations/*.sql (tracked in dbo._migrations)
npm run seed                                 # demo data: 16 schools, admin/committee1-5/mentor1 (password123), full queue
npm run migrate:data -- <path-to-pg_dump.sql>  # SPEC §9 production data migration
npm run start:dev                            # http://localhost:4000
npm run build
npm run lint                                 # oxlint src/ test/
npm test                                     # all unit tests (Jest, in-memory fakes — no DB needed)
npx jest path/to/file.spec.ts                # single test file
npx jest -t "test name substring"            # single test by name
npm run test:e2e                             # jest -c test/jest-e2e.json
```

Backend requires a **TCP-reachable** MSSQL server (`mssql`/tedious driver — named-pipe-only LocalDB will not work). Configure in `backend/.env` (copy from `.env.example`).

### Frontend (`frontend/`)

```bash
npm run dev     # http://localhost:3000 — requires backend running + .env.local BACKEND_URL set
npm run build
npm run lint    # eslint
```

No test suite exists in `frontend/` currently.

## Architecture

### Backend: Clean Architecture, no ORM

Layering is `controller → use-case → domain → repository`, enforced by directory structure under `src/modules/<feature>/`:

- **Controllers** handle HTTP + DTO validation (`class-validator`/`class-transformer`), delegate everything else to a use-case.
- **Use-cases** (`use-cases/*.use-case.ts`) hold business logic and are unit-tested against **in-memory fake repositories** from `src/testing/` — this is why the Jest suite needs no real database. High-risk use-cases (claim race condition, permission scoping, incomplete-score submission, mentor scope, scoring lock) have dedicated specs; see `backend/README.md`'s "Layout" table for the risk map.
- **Repositories** (`*.repository.ts` interface + `*.repository.mssql.ts` implementation) are the only place raw SQL lives — always parameterized via `mssql`, never string-concatenated.
- **Domain** (`src/domain/entities.ts`) holds plain entity types with no framework dependencies.

Cross-cutting rules:

- `AuthGuard` decodes the JWT, but `RolesGuard`/`@Roles()` **re-queries the DB to confirm the role on every request** rather than trusting the JWT claim alone (SPEC §2.2) — don't "optimize" this away.
- Any write that touches both `Score` and `AuditLog` **must** go through the shared transaction helper (`TransactionRunner`, SPEC §1.4) so both writes commit or roll back together.
- The queue-claim race condition is closed with an atomic `UPDATE ... WHERE Status='WAITING' AND ClaimedByUserId IS NULL` at the SQL layer, not with application-level locking — see `queue.repository.mssql.ts` and `claim-queue-item.use-case.ts`.
- Migrations are plain numbered `.sql` files in `migrations/`, applied in order and tracked in `dbo._migrations` — there's no ORM migration DSL.
- Realtime is Server-Sent Events (`modules/realtime/`), not WebSockets: events are `ready`/`changed`/`ping` (SPEC §2.3).

### Frontend: BFF pattern, no business logic

The Next.js app **never queries a database and holds no business rules** — it exists to own the httpOnly session cookie and proxy everything else to the NestJS backend.

- `src/proxy.ts` (Next 16's renamed `middleware.ts`) role-gates `/admin`, `/committee`, `/mentor` by *decoding* (not verifying) the JWT cookie for UX redirects only — real authorization always happens in the NestJS Guard. Don't add authorization logic here beyond redirect-for-UX.
- `src/app/api/bff/auth/login|logout/route.ts` are the only two routes with special handling (set/clear the httpOnly cookie); `src/app/api/bff/[...path]/route.ts` is a generic catch-all proxy that attaches `Authorization: Bearer <token>` from the cookie and streams the response through unchanged — this is what makes file upload/CSV/XLSX download work without special-casing.
- `src/lib/use-queue-stream.ts` connects to the NestJS SSE endpoint **directly**, bypassing the BFF proxy, because SPEC §2.3 says that stream carries no sensitive payload.
- `GET /api/bff/queue/mine`'s response nests each item's roster as `school.students` with `scores` at the item's top level — this mirrors SPEC §2.5's literal notation; don't "flatten" it without checking `backend/src/modules/queue/use-cases/get-my-queue.use-case.ts` first.
- Design tokens (colors, fonts, component patterns) come from SPEC §3 — implement screens to match, not redesign.

### Data migration

`backend/src/database/migrate-data.ts` parses the PostgreSQL `pg_dump` in `backup/` and loads it into the new MSSQL schema per the approach documented in that file's own header comment (SPEC §9). Its test (`migrate-data.spec.ts`) runs against the real backup file, not a synthetic fixture — keep it that way if you touch the parser.
