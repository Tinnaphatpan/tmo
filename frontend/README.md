# TMO Grading Queue — Frontend (Next.js 16, App Router)

BFF pattern (SPEC §1.2/§2.2): this app never talks to a database and holds
no business logic — it proxies to the NestJS API in `../backend` and owns
one thing, the httpOnly session cookie.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```
