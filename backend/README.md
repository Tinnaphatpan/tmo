# TMO Grading Queue — Backend (NestJS)

Clean Architecture: `controller → use-case → domain → repository`. No ORM —
raw parameterized SQL via `mssql` (tedious driver). See `../SPEC.md` for the
full requirement spec; section numbers are referenced throughout the code
(`// SPEC §2.6` etc.) next to the business rule they implement.

## Setup

```bash
npm install
cp .env.example .env
npm run migrate
npm run seed
npm run start:dev
```
