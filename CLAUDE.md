# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read this file in full before creating or editing `.claude/settings.json`** (permissions, hooks, etc.) — settings should respect the architecture and constraints documented here, not just the immediate task.

## ⚠️ Active refactor in progress: 5-role model + score approval/e-signature/PDF

A large, multi-session refactor is underway, driven by two design docs the user provided in chat (a role/logic summary and a UI/UX + color-palette doc — not files in this repo). **The full plan lives at `C:\Users\Tinnaphat\.claude\plans\joyful-cuddling-lamport.md` — read it in full before continuing this work.** It has the complete phase list, schema details, and the reasoning behind every decision below.

Four foundational decisions were confirmed with the user and are already implemented — don't re-litigate them:
1. `MENTOR` renamed to `TEAM_LEADER` (same role, extended with write/approval power) — not a new 4th role.
2. E-signature = admin pre-uploads a static signature image per user; the system stamps it automatically at approval (never drawn live).
3. Skip Queue = release the item + reorder to the end of that problem's queue — no new `QueueItem` status.
4. STAFF-submitted scores/PDF signatures are attributed to the STAFF member's own identity, never the nominal COMMITTEE member they're covering for.

**Backend phases done and committed** (frontend mostly not started yet — see gap below):
- **B0** — role rename (`MENTOR`→`TEAM_LEADER`) + new `STAFF` role; `CommitteeAssignment` generalized to `UserAssignment` (adds nullable `SchoolId` scoping); migrations `002`/`003`; frontend route rename (`/mentor`→`/team-leader`, `/staff` placeholder, `session.ts`/`proxy.ts` updated)
- **B1** — score submission → pending-approval workflow (`QueueItem.ApprovalStatus`, migration `004`)
- **B2** — e-signature + PDF generation: `pdfkit` + OFL-licensed Thai font (`@expo-google-fonts/noto-sans-thai` — ships real `.ttf`, unlike `@fontsource`'s woff-only build), new `FileStorage` abstraction (`backend/src/common/file-storage.ts`) so PDF/signature I/O stays fake-able in tests, admin signature upload endpoint
- **B3** — score-edit-request review moved from `ADMIN` to `TEAM_LEADER` (school-scoped via Score→QueueItem→SchoolId); approving a revision regenerates the PDF
- **B5** — Skip Queue: `POST /queue/:id/skip` (`COMMITTEE`/`STAFF`, caller must hold the item) releases it and sets `Position` to max sibling position for that problem + 1 (`SkipQueueItemUseCase`)
- **B6** — `GET /admin/permissions` (`ADMIN`): every COMMITTEE/STAFF/TEAM_LEADER user with `role`, `schoolId`, `hasSignature`, `assignments[]` (`GetPermissionMatrixUseCase`)
- **F1** — shared sidebar shell: `components/layout/AppSidebar.tsx` (fixed slate sidebar md+, drawer on mobile, print-hidden) used by new `committee|staff|team-leader/layout.tsx` and rewritten `admin/layout.tsx`; per-page headers/`LogoutButton` removed. Each role has a single nav item for now — F2/F3/F5 add entries to those `NAV` arrays
- **F2** — approval UI: `team-leader/approvals/page.tsx` (pending list, approve-and-sign, PDF link after approval, score table for context), `StatusBadge` `PENDING_APPROVAL`/`APPROVED` + `--state-pending-approval-*` tokens, `ScoreForm` copy → "ส่งคะแนนเพื่อรออนุมัติ", committee done-list shows approval badge. Only pending items are listable (no backend endpoint for already-approved ones), so the page shows PDF links only for approvals made in the current session
- **F3** — `staff/page.tsx`: Call Next (claims lowest-`position` WAITING item from `/queue/mine`), Skip (`/queue/:id/skip`), Return, Mark Complete via `ScoreForm`; live via SSE. Skip is staff-only in the UI for now (backend also allows COMMITTEE)
- **F4** — `admin/committee/page.tsx` rewritten as unified "ผู้ใช้และสิทธิ์" page (route unchanged): role tabs, reads `/admin/permissions` + `/admin/schools`; COMMITTEE = problem picker, STAFF = `ProblemSchoolMatrix` rows (problem + school or all); create/edit/delete via `/admin/committee|staff`; per-user signature upload to `/admin/users/:id/signature`. TEAM_LEADER tab is signature-only (no backend CRUD for creating/deleting team leaders exists)
- **F5** — `components/Watermark.tsx` (fixed tiled SVG overlay of name · role · server timestamp, `--watermark-opacity` token, print-hidden) mounted in committee/staff/team-leader layouts (now async, read `getSession()`); backend `GET /scoreboard` (`COMMITTEE`/`STAFF`, `modules/scoreboard/`) + `committee/scoreboard/page.tsx` — first-pass per-school × per-problem sums, alphabetical, no ranking (design docs do not specify one), all schools visible, not filtered to the caller's assignments. No scoreboard nav entry for STAFF yet
- **F6 + score-edit-requests move** — `ScoreForm` "บันทึกร่าง" (sessionStorage per item, cleared on submit); `admin/score-edit-requests` page moved to `team-leader/score-edit-requests` (closes the known gap above; admin nav entry removed)
- **Public queue board** — `/queue` is now the schedule-grid overview (`components/QueueBoardTable.tsx`): rows = start slots, columns = problems 1-5, cell = school code + time, IN_PROGRESS cell highlighted amber, DONE muted, banner "HH:mm - HH:mm น.: การทวนสอบวันแรก (date, Buddhist year)" computed from the slots (label text is the constant `BOARD_SESSION_LABEL`). Cream/lavender look is scoped to `.queue-board` CSS vars in globals.css; the rest of the app keeps Red/Slate. **When running `next build` in a shell where backend `.env` was sourced, `unset NODE_ENV` first** (NODE_ENV=development breaks the build with a `_global-error` useContext error).
- **Team leader CRUD + role change** — `POST/PATCH/DELETE /admin/team-leaders` (school-bound, refuses non-team-leaders); `PATCH /admin/users/:id/role` (`ChangeUserRoleUseCase`: only among COMMITTEE/STAFF/TEAM_LEADER, ADMIN untouchable in both directions, scope required in the same call, blocked with 409 while the user holds an IN_PROGRESS item, one transaction, `USER_ROLE_CHANGED` AuditLog with before/after JSON); `GET /auth/me`; the `/admin/committee` page has a team-leader tab with create/edit/delete and a per-row "เปลี่ยนบทบาท" panel. Verified live on a scratch MSSQL DB (incl. stale-cookie redirect, no loop).
- **API tests** — `backend/src/testing/api-test-app.ts` is an HTTP harness (real AuthGuard/RolesGuard/ValidationPipe/exception filter + fake repos, via supertest); controller specs: `queue.controller.spec.ts`, `queue-flow.controllers.spec.ts`, `admin.controllers.spec.ts`, `admin-crud.controllers.spec.ts`, `approval.controller.spec.ts`, `scoreboard.controller.spec.ts`, `team-leader.controllers.spec.ts`, `auth/auth-and-public.controllers.spec.ts`. Frontend tests: see Commands
- **B4** — `STAFF` delegation: queue claim/submit/score-edit-request now accept `STAFF` within their `UserAssignment` scope (zero role-branching needed — same `(problemNumber, schoolId-null-or-match)` predicate serves both `COMMITTEE` and `STAFF`); `admin/staff` CRUD

**Still to do:** every planned phase is implemented and was verified live (2026-09-23, scratch DB, since dropped): fresh migrations 001-004 + seed, claim/skip/score/approve/PDF/scoreboard/STAFF scope over HTTP, and the BFF UI flows (signature upload, Call Next, Save Draft, approve). Tests: backend 29 suites/220 tests (use-cases + HTTP specs covering every controller endpoint: 401/403 per role, DTO validation, success and error paths), frontend 9 files/94 tests. Not done: visually confirming Thai glyphs in the PDF (font embedded, Thai mappings present).
- Frontend theme swap (KMUTNB Red `#C8102E` + Slate `#0F172A`, no dark mode) was already done and verified in an earlier session — don't redo it, just build new UI against the tokens already in `frontend/src/app/globals.css`.

**To resume this work in a new chat, say:**
> Continue the role-model refactor — read `C:\Users\Tinnaphat\.claude\plans\joyful-cuddling-lamport.md` and the "Active refactor in progress" section of CLAUDE.md, then finish the plan (all B/F phases done; remaining: live end-to-end verification against a real MSSQL backend).

(Swap "F6" for whichever phase is next once more land — update this line and the phase lists above as you go.)

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
npm run seed                                 # demo data: 16 schools, admin/committee1-5/team-leader1/staff1 (password123), full queue
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
npm test        # vitest run (jsdom + Testing Library; api client and SSE hook are mocked, no backend needed)
npx vitest run src/app/pages.test.tsx   # single file
```

Frontend tests live next to the code as `*.test.ts(x)` (config: `vitest.config.mts`, `vitest.setup.ts`): proxy role gate, api client, shared components, `ScoreForm` (incl. Save Draft), and the staff/committee/scoreboard/approvals/score-edit-requests/admin-permissions pages.

## Architecture

### Backend: Clean Architecture, no ORM

Layering is `controller → use-case → domain → repository`, enforced by directory structure under `src/modules/<feature>/`:

- **Controllers** handle HTTP + DTO validation (`class-validator`/`class-transformer`), delegate everything else to a use-case.
- **Use-cases** (`use-cases/*.use-case.ts`) hold business logic and are unit-tested against **in-memory fake repositories** from `src/testing/` — this is why the Jest suite needs no real database. High-risk use-cases (claim race condition, permission scoping, incomplete-score submission, team-leader/school scope, scoring lock) have dedicated specs; see `backend/README.md`'s "Layout" table for the risk map (pre-refactor — new modules like `approval/`, `user-assignment/`, `team-leader/` aren't reflected there yet).
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

- `src/proxy.ts` (Next 16's renamed `middleware.ts`) only requires a live (non-expired, decoded-not-verified) session cookie for `/admin`, `/committee`, `/staff`, `/team-leader` — it must NOT compare roles, because the cookie's `role` claim goes stale when an admin changes a user's role (a role check here loops with the layouts). Role-vs-page gating is `requireRole()` in `src/lib/session.ts`, called by each role layout: it asks the backend `GET /auth/me` (fresh DB role) and redirects to the right home / `/login`; on backend outage it falls back to the cookie. Real authorization is always the NestJS Guard, never this proxy.
- `src/app/api/bff/auth/login|logout/route.ts` are the only two routes with special handling (set/clear the httpOnly cookie); `src/app/api/bff/[...path]/route.ts` is a generic catch-all proxy that attaches `Authorization: Bearer <token>` from the cookie and streams the response through unchanged — this is what makes file upload/CSV/XLSX download work without special-casing.
- `src/lib/use-queue-stream.ts` connects to the NestJS SSE endpoint **directly**, bypassing the BFF proxy, because SPEC §2.3 says that stream carries no sensitive payload.
- `GET /api/bff/queue/mine`'s response nests each item's roster as `school.students` with `scores` at the item's top level — this mirrors SPEC §2.5's literal notation; don't "flatten" it without checking `backend/src/modules/queue/use-cases/get-my-queue.use-case.ts` first.
- Design tokens (colors, fonts, component patterns) come from SPEC §3 — implement screens to match, not redesign.

### Data migration

`backend/src/database/migrate-data.ts` parses the PostgreSQL `pg_dump` in `backup/` and loads it into the new MSSQL schema per the approach documented in that file's own header comment (SPEC §9). Its test (`migrate-data.spec.ts`) runs against the real backup file, not a synthetic fixture — keep it that way if you touch the parser.
