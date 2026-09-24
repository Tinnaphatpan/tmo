# TMO Grading Queue — Frontend (Next.js 16, App Router)

BFF pattern (SPEC §1.2/§2.2): this app never talks to a database and holds
no business logic — it proxies to the NestJS API in `../backend` and owns
one thing, the httpOnly session cookie.

## Setup

```bash
npm install
cp .env.example .env.local   # point BACKEND_URL / NEXT_PUBLIC_API_URL at a running backend
npm run dev
``````

## A note on this environment

Built without a running backend (see `../backend/README.md` for why — this
sandbox can't open a live MSSQL/tedious connection). What was actually
verified here:

- `npm run build` and `npx eslint .` are clean across all 18 routes.
- The auth redirect flow was exercised for real in a browser: hitting
  `/admin` with no session cookie correctly lands on
  `/login?callbackUrl=%2Fadmin`, proving `src/proxy.ts` decodes the cookie
  and redirects as SPEC §2.2 describes.
- The design system (SPEC §3) was checked in both light and dark
  `prefers-color-scheme` in a real browser.
- Every data-fetching page was confirmed to fail *gracefully* (a Thai
  loading/error message, no crash) when the BFF can't reach a backend —
  this is the state anyone will see until a real `BACKEND_URL` is wired up.

Before trusting this against real users: start the NestJS backend (with a
real MSSQL connection) and `npm run dev` here, then click through the full
happy path for each of the three roles.

## Response shape note

`GET /api/bff/queue/mine` nests each item's roster as `school.students` and
carries `scores` at the item's top level, matching SPEC §2.5's own notation
("`items: [...พร้อม school.students + scores]`") literally — see
`backend/src/modules/queue/use-cases/get-my-queue.use-case.ts`.
