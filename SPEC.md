# TMO Grading Queue — Requirements Spec for Rewrite

> เอกสารนี้เป็น requirement spec สำหรับนำไปเขียนระบบใหม่ทั้งหมด เก็บเฉพาะสิ่งที่จำเป็น (business logic, data contract, design system) ไม่ใช่คู่มือใช้งานทั่วไป
> ข้อมูลจริงในฐานข้อมูล (schools/students/scores/users ฯลฯ) สำรองไว้แยกต่างหากที่ [backup/](backup/) — ดูหัวข้อ 9

---

## 0. Overview — ทำไมต้องออกแบบแบบนี้

**โจทย์**: การแข่งขัน TMO ใช้การตรวจแบบ **oral verification ต่อหน้า** ไม่ใช่ตรวจกระดาษเงียบ ๆ — ตัวแทนแต่ละศูนย์ต้องเดินไปอธิบายคำตอบต่อหน้ากรรมการทีละข้อ ดังนั้นระบบนี้ไม่ใช่แค่ "ระบบกรอกคะแนน" แต่เป็น **ระบบคิว + ตารางเวลา** ที่ควบคุมว่าใครต้องไปพบใครตอนไหน

เงื่อนไขทางธุรกิจที่กำหนดรูปทรงของระบบทั้งหมด:

1. **16 ศูนย์สอบ × 5 ข้อ × กรรมการ 5 คน** — กรรมการ 1 คนตรวจข้อเดียวกันของทุกศูนย์ (ไม่ใช่ตรวจทุกข้อของศูนย์เดียว) เพื่อให้มาตรฐานการให้คะแนนของแต่ละข้อสม่ำเสมอ ไม่ขึ้นกับว่าใครตรวจศูนย์ไหน → นี่คือที่มาของ `CommitteeAssignment` (userId + problemNumber)
2. **ตารางหมุนเวียนแบบไม่ชนกัน (rotation)** — ทุกศูนย์ต้องได้พบกรรมการครบ 5 ข้อ โดยไม่มีศูนย์ไหนถูกนัดสองข้อพร้อมกัน ใช้สูตร modular rotation (ดูหัวข้อ 2.4) แทนการจัดตารางด้วยมือ
3. **Public board ต้องไม่รั่วคะแนน** — จอฉายโปรเจกเตอร์และหน้า `/queue` เปิดให้ทุกคนดูได้ (ผู้ปกครอง, นักเรียนศูนย์อื่น) แต่ต้อง **ไม่เห็นคะแนน/กรรมการ/หมายเหตุ** เพื่อความเป็นธรรม จึงต้องมี API แยกชั้นสิทธิ์ระหว่าง public (`/api/queue`) กับ committee (`/api/queue/mine`)
4. **กันแย่งคิว (race condition)** — กรรมการหลายคนอาจกดรับตรวจพร้อมกัน ต้องมีกลไก atomic claim ระดับ DB ไม่ใช่แค่เช็คที่ UI
5. **ล็อกคะแนนทั้งระบบพร้อมกันครั้งเดียว** — เมื่อหมดเวลาแข่งขัน แอดมินต้อง "ปิดรับคะแนน" ทีเดียวทั้งระบบ (ไม่ใช่ทีละคิว) เพื่อป้องกันการแก้คะแนนหลังประกาศผล แล้วให้กรรมการที่อยากแก้ต้องยื่นคำขอผ่านแอดมินแทน — เป็นที่มาของ `CompetitionSettings` (singleton) + `ScoreEditRequest`
6. **Mentor เห็นได้แค่ศูนย์ตัวเอง** — ครูที่ปรึกษาต้องดู/export คะแนนนักเรียนตัวเองได้ แต่ห้ามเห็นศูนย์อื่น → `User.schoolId` scope ทุก query
7. **ทุกการแก้คะแนนต้องมี audit trail** — เพราะเป็นการแข่งขันที่มีข้อพิพาทได้ ทุกจุดที่เขียน `Score` (ทั้งจากกรรมการให้คะแนนตรง ๆ และจากแอดมินอนุมัติคำขอแก้ไข) ต้องบันทึก `AuditLog` ในธุรกรรมเดียวกันเสมอ ห้ามมีทางแก้คะแนนที่ข้าม audit ได้

**บทบาทผู้ใช้ (3 roles)**:
- **ADMIN** — ตั้งค่าทั้งระบบ: โรงเรียน, นักเรียน, กรรมการ, คิว, ล็อกคะแนน, อนุมัติคำขอแก้ไข, ดู audit log
- **COMMITTEE** — ตรวจเฉพาะข้อที่ได้รับมอบหมาย: รับคิว, ให้คะแนน, ยื่นคำขอแก้ไข
- **MENTOR** — ดู/export คะแนนของศูนย์ตัวเองอย่างเดียว (read-only, scoped)

> **เวอร์ชันนี้ปรับให้ตรงกับ tech stack ใหม่แล้ว** (ดูหัวข้อ 1) — โค้ดอ้างอิงเดิม (`prisma/`, `lib/auth.ts`, `proxy.ts` ฯลฯ) เป็นของระบบเก่าที่ backup ไว้เพื่อดูพฤติกรรมอ้างอิงเท่านั้น ไม่ใช่โครงสร้างที่ระบบใหม่ต้องเดินตาม

---

## 1. Tech Stack & Architecture Decisions

### 1.1 Stack ที่เลือก

**Front-End**
- **Next.js** (React) — เฟรมเวิร์กหลักฝั่งหน้าบ้าน สร้าง UI, จัดการ state, ดึงข้อมูลมาแสดงผล
- **Tailwind CSS** — จัดสไตล์/ธีม/responsive (คง [design tokens เดิม](#3-uiux--design-system) ไว้ทั้งหมด)
- **Axios** — เรียก REST API ไป-กลับกับหลังบ้าน

**Back-End** (Clean Architecture)
- **Node.js (LTS) + TypeScript** — runtime + type safety คุมการแบ่งเลเยอร์
- **NestJS** — เฟรมเวิร์กหลัก ใช้ Dependency Injection แยก Business Logic (Use Case) ออกจาก DB และโลกภายนอกอย่างเด็ดขาด
- **Microsoft SQL Server** — ฐานข้อมูลหลัก
- **`mssql` (node-mssql)** — ไดรเวอร์เชื่อม DB เขียน raw SQL + connection pooling เอง **ไม่มี ORM**
- **class-validator / class-transformer** — validate + transform DTO ที่ชั้น Controller
- **`@nestjs/jwt`** — ออก/ตรวจ JWT
- **Jest** — unit test ชั้น Use Case

### 1.2 สถาปัตยกรรมระดับสูง

```
Browser
  │  (cookie: httpOnly session)
  ▼
Next.js  ──┬── Server Component / Page (SSR, อ่าน cookie เพื่อ role-gate หน้า)
           └── Route Handler "/api/bff/*" (BFF proxy)
                  │  แนบ Authorization: Bearer <JWT> จาก cookie
                  ▼
NestJS API  ──  Controller (DTO validate) → Use Case (business logic) → Repository (raw SQL) → MSSQL
```

Next.js **ไม่คุย DB เอง** — ทำหน้าที่เป็น BFF (Backend-For-Frontend) เท่านั้น ตรรกะทางธุรกิจทั้งหมดอยู่ที่ NestJS ฝั่งเดียว (ตรงข้ามกับระบบเดิมที่ Next.js เป็น full-stack ในตัวเอง)

### 1.3 การตัดสินใจสถาปัตยกรรม 3 ข้อ (ล็อกไว้แล้ว)

| ประเด็น | ทางเลือกที่ใช้ | เหตุผล |
| --- | --- | --- |
| **Auth ต่อกันแบบไหน** | **BFF pattern**: Next.js server ถือ JWT ใน **httpOnly cookie**, proxy request ไป NestJS พร้อมแนบ `Authorization: Bearer` | ปลอดภัยกว่าเก็บ JWT ใน `localStorage` (กัน XSS ขโมย token); browser ไม่เห็น token เลย |
| **Migration ทำยังไง** | ไฟล์ `.sql` เรียงเลข (เช่น `001_init.sql`, `002_add_scheduled_at.sql`, ...) + ตาราง `_migrations` เก็บว่ารันอะไรไปแล้ว (ชื่อไฟล์ + วันที่) | ไม่มี ORM ให้ auto-generate migration จึงต้อง track เอง แบบง่ายสุดไม่ต้องพึ่ง tool เพิ่ม |
| **ID แบบไหน** | **`UNIQUEIDENTIFIER`** (GUID, `DEFAULT NEWID()`) ทุกตาราง | รักษาพฤติกรรมเดิมที่ใช้ `cuid()` ของ Prisma — ID เดาไม่ได้ (ดูหัวข้อ 8 ข้อ 3 เรื่อง API token/ID predictability) |

### 1.4 กติกาที่ต้องคงไว้แม้ไม่มี ORM (สำคัญ)

ของเดิมใช้ Prisma `$transaction` ทำให้ "เขียน `Score` + เขียน `AuditLog` ต้องอยู่ธุรกรรมเดียวกันเสมอ" ทำได้ง่ายเพราะ Prisma คุมให้ ตอนนี้ใช้ raw SQL ผ่าน `mssql` เอง **ต้องเขียน wrapper บังคับ pattern นี้ไว้ที่ชั้น Repository/Use Case** (เช่น `Transaction` helper ที่รับ callback แล้ว commit/rollback เอง) ห้ามปล่อยให้แต่ละ Use Case เปิด/ปิด transaction เองแบบไม่มีมาตรฐาน เพราะพลาดง่ายกว่าตอนใช้ ORM มาก — ดูหัวข้อ 2.6

---

## 2. Database & API

### 2.1 Database Schema (MSSQL, raw SQL — ไม่มี ORM)

```
ค่าที่เคยเป็น Enum ใน Prisma → MSSQL ไม่มี native enum type
  ใช้ VARCHAR + CHECK constraint แทน:
  Role         VARCHAR(10)  CHECK (Role IN ('ADMIN','COMMITTEE','MENTOR'))
  QueueStatus  VARCHAR(11)  CHECK (QueueStatus IN ('WAITING','IN_PROGRESS','DONE'))
```

| Table | คำอธิบาย | ฟิลด์สำคัญ (type ที่แนะนำสำหรับ MSSQL) |
| --- | --- | --- |
| **School** | ศูนย์สอบ/โรงเรียน | `Id UNIQUEIDENTIFIER PK DEFAULT NEWID()`, `Name NVARCHAR(255) UNIQUE`, `Code NVARCHAR(20) NULL` |
| **User** | บัญชีผู้ใช้ทุก role | `Id UNIQUEIDENTIFIER PK`, `Username NVARCHAR(50) UNIQUE`, `PasswordHash NVARCHAR(255)` (bcrypt), `Role VARCHAR(10)`, `SchoolId UNIQUEIDENTIFIER NULL FK→School` (ใช้เฉพาะ MENTOR — จำกัดขอบเขต query/export) |
| **CommitteeAssignment** | กรรมการคนหนึ่งตรวจข้อไหน | `UserId UNIQUEIDENTIFIER FK→User`, `ProblemNumber INT`; `UNIQUE (UserId, ProblemNumber)` |
| **QueueItem** | 1 รายการ = 1 ศูนย์ + 1 ข้อ ที่ต้องตรวจ | `SchoolId FK→School`, `ProblemNumber INT`, `Status VARCHAR(11)`, `Position INT`, `ScheduledAt DATETIME2 NULL` (เวลาที่ควรเริ่ม slot 15 นาที — บอร์ดสาธารณะคำนวณ "กำลังตรวจสอบ/ตามคิว/เสร็จแล้ว" จากเวลานี้), `ClaimedByUserId UNIQUEIDENTIFIER NULL FK→User`, `ClaimedAt DATETIME2 NULL`, `CompletedAt DATETIME2 NULL`; `UNIQUE (SchoolId, ProblemNumber)`; FK ไป School ต้องเป็น `ON DELETE NO ACTION` (MSSQL ไม่ยอม cascade path ซ้อนกันหลายทาง ต้องลบ QueueItem เองในโค้ดก่อนลบ School — ผลลัพธ์เดียวกับ Prisma `onDelete: Restrict` เดิม) |
| **Student** | นักเรียนของศูนย์ (fixed 6 คน/ศูนย์) | `StudentCode NVARCHAR(20) UNIQUE` (= seqNo + School.code เช่น `1KMUTNB`), `SeqNo INT`, `SchoolId FK→School ON DELETE CASCADE`; `UNIQUE (SchoolId, SeqNo)` |
| **Score** | คะแนนของนักเรียน 1 คน ต่อ 1 QueueItem | `Value DECIMAL(4,2)` + `CHECK (Value BETWEEN 0.00 AND 10.00)`, `JudgeId FK→User`; `UNIQUE (StudentId, QueueItemId)` — **หมายเหตุ**: unique ไม่รวม `JudgeId` ดู limitation หัวข้อ 8 |
| **CompetitionSettings** | Singleton (`Id = 1` เสมอ, บังคับด้วย `CHECK (Id = 1)`) | `ScoringLocked BIT`, `LockedAt DATETIME2 NULL`, `LockedBy UNIQUEIDENTIFIER NULL` |
| **ScoreEditRequest** | คำขอแก้คะแนนหลังล็อก | `ScoreId FK→Score`, `RequestedBy FK→User`, `OldValue/NewValue DECIMAL(4,2)`, `Reason NVARCHAR(MAX)`, `Status VARCHAR(10)` (`PENDING`/`APPROVED`/`REJECTED`), `ReviewedBy UNIQUEIDENTIFIER NULL`, `ReviewedAt DATETIME2 NULL` |
| **AuditLog** | ประวัติทุกการแก้ไข | `Action NVARCHAR(50)`, `EntityType NVARCHAR(30)`, `EntityId NVARCHAR(100)`, `OldValue/NewValue NVARCHAR(MAX) NULL`, `CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()` |

**Migration history เดิม** (ลำดับที่ schema วิวัฒนาการมาตอนเป็น Prisma — เก็บไว้เป็น reference ว่า schema ผ่านการปรับอะไรมาบ้าง ไม่ใช่สิ่งที่ต้อง replay ในระบบใหม่): init → เพิ่ม `scheduledAt` → เปลี่ยนคะแนนจากระดับศูนย์เป็นระดับนักเรียนรายคน → เปลี่ยนชื่อ role → เปลี่ยนชื่อ `USER→COMMITTEE`, `ProblemAssignment→CommitteeAssignment` → ตัด `Score.notes` ทิ้ง

**Migration ของระบบใหม่**: ไฟล์ `.sql` เรียงเลขใน `/migrations` (`001_init.sql`, `002_...`) รันตามลำดับ + ตาราง `_migrations` เก็บ filename ที่รันแล้ว กันรันซ้ำ — ไม่มี auto-generate จาก schema เหมือน Prisma ต้องเขียน SQL DDL เองทุกไฟล์

**Data access**: repository layer เขียน parameterized query ผ่าน `mssql` (`request.input(...)` ทุกค่าที่มาจาก user — ห้าม string-concat SQL เด็ดขาดเพื่อกัน SQL injection เพราะไม่มี ORM มาช่วยกันให้อัตโนมัติเหมือนเดิม)

### 2.2 Auth & Authorization (สำคัญมาก — ต้องคง requirement นี้ไว้แม้ implementation เปลี่ยน)

สถาปัตยกรรม BFF ที่ล็อกไว้ (หัวข้อ 1.3) กำหนด flow ใหม่ดังนี้:

- **Login**: browser submit username/password ไป Next.js Route Handler (`/api/bff/auth/login`) → Next.js เรียกต่อไป NestJS `POST /auth/login` → NestJS ตรวจ username, `bcrypt.compare` password, ถ้าถูกต้องออก JWT ผ่าน `@nestjs/jwt` (`JwtService.sign()`) → Next.js รับ JWT มาเก็บใน **httpOnly, secure, sameSite=lax cookie** (browser เข้าถึงค่า token ไม่ได้เลย) → ไม่คืน JWT ให้ browser เห็นตรง ๆ
- **JWT payload**: คงชุดเดิม — `id`, `username`, `displayName`, `role`, `schoolId` (schoolId มีเฉพาะ MENTOR)
- **ทุก request ที่เข้า NestJS**: Next.js BFF แนบ `Authorization: Bearer <token>` (อ่านจาก httpOnly cookie ฝั่ง server เท่านั้น) — browser ไม่เคยเห็น/ส่ง JWT ตรงไป NestJS เอง
- **NestJS Guard** (`AuthGuard` + custom `RolesGuard`/`@Roles()` decorator): verify signature ของ JWT ก่อน แล้ว **query DB ยืนยัน role จริงอีกครั้งทุก request** (เหมือน `requireApiRole` เดิม) — เพราะ JWT ยัง valid จนหมดอายุแม้ user ถูกลบ/เปลี่ยน role กลางคัน **ห้ามเชื่อ claim ใน JWT เพียงอย่างเดียว** ทำ guard นี้เป็น global guard หรือ decorator ที่ต้องแปะทุก controller ที่ไม่ public
- **Next.js middleware (page-level gate)**: decode JWT จาก cookie (ไม่ต้อง query DB ซ้ำที่ชั้นนี้ก็ได้ เพราะเป็นแค่ UX-level redirect ไม่ใช่ authorization จริง) แล้ว redirect ก่อนเข้าถึง `/admin/*`, `/committee/*`, `/mentor/*` — ไม่ login → `/login?callbackUrl=...`; role ไม่ตรง prefix → redirect หน้า home ของ role ตัวเอง — **การตรวจสิทธิ์จริงเกิดที่ NestJS Guard เสมอ (defense in depth) ไม่ใช่พึ่ง middleware ฝั่งเดียว**
- **Logout**: Next.js ลบ cookie (ไม่ต้องมี server-side token revocation list เพราะ JWT อายุสั้นพอ — กำหนด TTL ให้เหมาะกับความยาวงานแข่งขัน 1 วัน)

### 2.3 Realtime Architecture

หลักการเดิมยังใช้ได้ ปรับ implementation ให้เข้ากับ NestJS:

- **กลไก**: NestJS service เดียวถือ in-memory pub/sub (เช่น RxJS `Subject`) แทน `lib/queue-watcher.ts` เดิม
  1. ทุก Use Case ที่เขียนอะไรกระทบคิว → เรียก service กลาง broadcast event ทันที (latency ระดับ ms)
  2. Background poll สำรอง **ทุก 1 วินาที** เทียบ fingerprint (เช่น hash ของ `COUNT`/`MAX` บนตาราง QueueItem/Score) เผื่อมีการเขียนจาก instance อื่นหรือแก้ DB ตรง ๆ — ต้องมีเผื่อ deploy หลาย instance (ถ้า scale-out ค่อยพิจารณา Redis Pub/Sub แทน in-memory เพราะ in-memory sync กันข้าม instance ไม่ได้)
  3. Expose เป็น **SSE** ผ่าน NestJS `@Sse()` decorator — คง event contract เดิม 3 แบบ: `ready`, `changed` (data = timestamp เท่านั้น, client refetch เอง), `ping` (heartbeat กัน proxy ตัดการเชื่อมต่อ)
- **ผ่าน BFF หรือตรง**: เนื่องจาก SSE เป็น long-lived connection การ proxy ผ่าน Next.js Route Handler ทำได้แต่เพิ่มความซับซ้อน — แนะนำให้ browser ต่อ SSE ไป NestJS โดยตรง (คนละ origin ก็ได้ถ้าตั้ง CORS + ส่ง credentials ถูกต้อง) ไม่ต้อง proxy ผ่าน BFF เหมือน endpoint อื่น เพราะ SSE ไม่มี sensitive data อยู่แล้ว (แค่สัญญาณ "มีอะไรเปลี่ยน")
- **Client pattern**: เหมือนเดิม — SSE บอกแค่ "มีอะไรเปลี่ยน" → client fetch ข้อมูลจริงจาก REST endpoint (ผ่าน Axios) อีกที ไม่ push payload ผ่าน SSE โดยตรง

### 2.4 Rotation/Scheduling Algorithm

สูตรจัดตารางหมุนเวียนให้ **16 ศูนย์พบครบ 5 ข้อ โดยไม่มีศูนย์ไหนถูกนัดสองข้อพร้อมกันในช่วงเวลาเดียว** (อ้างอิงจากตารางสอบ TMO 23 จริง) — ดู [prisma/seed.ts:44-65](prisma/seed.ts:44):

```
centre(slot, problemIndex) = SCHOOLS[(slot + ROTATION_STEP * problemIndex) % 16]
ROTATION_STEP = 13   // ≡ -3 (mod 16) — ต้อง coprime กับ 16 เพื่อให้ทุกศูนย์พบทุกข้อพอดี 1 ครั้ง

slot 0..15        → 16 ช่วงเวลา (1 ศูนย์เริ่มต้นต่อ 1 slot)
problemIndex 0..4  → ตำแหน่งข้อ 1-5 (คนละลำดับเวลาแม้ problemNumber เดียวกัน)
SLOT_MINUTES = 15
FIRST_SLOT_HOUR/MINUTE = 13:30 (จุดเริ่มของวันแข่ง)
```

ถ้าจำนวนศูนย์เปลี่ยนจาก 16 ในระบบใหม่ ต้องเลือก `ROTATION_STEP` ใหม่ที่ coprime กับจำนวนศูนย์ ไม่งั้นบางศูนย์จะพบข้อซ้ำ/ไม่ครบ 5 ข้อ

### 2.5 API Endpoints — Request/Response เต็ม

**สาธารณะ (ไม่ต้องล็อกอิน):**

`GET /api/queue` — สถานะคิวสาธารณะ (ไม่มีคะแนน/กรรมการ)
```jsonc
// 200
{
  "items": [{ "id", "problemNumber", "status", "position", "scheduledAt",
              "school": { "id", "name", "code" } }],
  "counts": { "waiting": n, "inProgress": n, "done": n, "total": n },
  "problemNumbers": [1,2,3,4,5],
  "byProblem": [{ "problemNumber", "total", "done", "inProgress" }],
  "slots": [{ "startsAt", "cells": [{ "id", "problemNumber", "school", "status" }] }],
  "scheduleDate": "ISO string | null",
  "updatedAt": "ISO string"
}
```

`GET /api/queue/stream` — SSE, `Content-Type: text/event-stream`, event: `ready` | `changed` | `ping` (data = timestamp เท่านั้น ไม่มี payload จริง)

**กรรมการ (role = COMMITTEE, ตรวจ role ผ่าน `requireApiRole`):**

| Endpoint | Request | Response / Error |
| --- | --- | --- |
| `GET /api/queue/mine` | — | `{ problemNumbers, items: [...พร้อม school.students + scores], currentItemId, scoringLocked, updatedAt }` — เฉพาะข้อที่ตัวเองได้รับมอบหมาย |
| `POST /api/queue/[id]/claim` | — | `200 { ok:true }` · `403` ถ้าไม่ได้รับมอบหมายข้อนี้ · `409` ถ้าถือคิวอื่นค้างอยู่แล้ว (`"คุณกำลังตรวจอีกรายการอยู่..."`) หรือถูกคนอื่นชิงไปก่อน (atomic `updateMany` guard บน `status:WAITING, claimedByUserId:null`) |
| `POST /api/queue/[id]/score` | `{ scores: [{ studentId, value }] }` (value 0-10) | `200 { ok:true }` (upsert ทุกคน + set `status:DONE, completedAt`) · `400` ค่าไม่ถูกต้อง/ไม่ครบทุกคนในศูนย์ · `403` ไม่ได้ถือคิวนี้อยู่ หรือปิดรับคะแนนแล้ว (`locked:true`) |
| `POST /api/queue/[id]/release` | — | `200 { ok:true }` · `409` ถ้าไม่ใช่เจ้าของ/ไม่ได้ IN_PROGRESS |
| `POST /api/score-edit-requests` | `{ scoreId, newValue, reason }` | `200 { id }` · `400` ข้อมูลไม่ครบ · `403` ไม่ใช่ judge เจ้าของ score นั้น · `404` ไม่พบ |

**ผู้ดูแลระบบ (role = ADMIN):**

| Endpoint | Request | Response / Error |
| --- | --- | --- |
| `POST /api/admin/schools` | `{ name, code? }` | `{ school }` · `409` ชื่อซ้ำ |
| `PATCH /api/admin/schools` | `{ id, name, code? }` | `{ school }` |
| `DELETE /api/admin/schools?id=` | — | `409` ถ้ายังมีคิวค้างของศูนย์นี้ |
| `POST /api/admin/committee` | `{ username, displayName, password(≥8 ตัว), problemNumbers[] }` | `{ user:{id,username} }` · `409` username ซ้ำ |
| `PATCH /api/admin/committee` | `{ id, problemNumbers?[], password?(≥8) }` | replace assignments ทั้งชุด + reset password ถ้าส่งมา |
| `DELETE /api/admin/committee?id=` | — | `403` ห้ามลบ ADMIN |
| `POST /api/admin/queue` | `{ schoolId, problemNumber }` | `{ item }` · `409` ศูนย์นี้มีข้อนี้ในคิวแล้ว (unique constraint) |
| `PATCH /api/admin/queue` | `{ id, direction:"up"|"down" }` | สลับ `position` กับ neighbour ที่ใกล้ที่สุด |
| `DELETE /api/admin/queue?id=` | — | ลบ queue item ตรง ๆ |
| `POST /api/queue/[id]/release` | — | admin force-release คิวของใครก็ได้ (ไม่เช็ค ownership) |
| `GET /api/admin/scores/export` | — | CSV (BOM UTF-8): คอลัมน์ `โรงเรียน, รหัส, รหัสนักเรียน, ชื่อนักเรียน, ข้อ, คะแนน, กรรมการ, username, เวลาบันทึก` — เรียงตาม โรงเรียน → seqNo → ข้อ |
| `POST /api/admin/students/import` | multipart form: `file` (.csv/.xlsx), `mode: "preview"|"commit"` | ดูหัวข้อ 4 |
| `DELETE /api/admin/students?id=` | — | ลบนักเรียนทีละคน |
| `PATCH /api/admin/settings/lock` | `{ locked: boolean }` | `{ scoringLocked }` — upsert singleton, บันทึก `lockedAt`/`lockedBy` |
| `PATCH /api/admin/score-edit-requests/[id]` | `{ action: "approve"|"reject" }` | approve → update `Score.value` จริง + `AuditLog` ในธุรกรรมเดียว; `409` ถ้า request ไม่ใช่ `PENDING` แล้ว |
| `GET /api/schedule/export` | — | CSV ตารางหมุนเวียน (ดูหัวข้อ 4) — **public**, ไม่ต้องมี role เพราะไม่มีคะแนน |
| `GET /api/mentor/export` | (role = MENTOR) | Excel รายงานของศูนย์ตัวเอง (ดูหัวข้อ 4) — ใช้ `session.user.schoolId` เท่านั้น ห้ามรับ schoolId จาก client |

**Error format มาตรฐาน**: ทุก endpoint คืน `{ error: string }` เป็นข้อความภาษาไทยพร้อม HTTP status (`400` validation, `401` ไม่ได้ login, `403` ไม่มีสิทธิ์, `404` ไม่พบ, `409` conflict/race condition) — ไม่มี error code แยกต่างหาก ฝั่ง client match ด้วยข้อความ/status เท่านั้น

### 2.6 Business Rules สรุป

- **การให้คะแนนต้องครบทีม**: เทียบ `Set` studentId ที่คาดไว้ (นักเรียนทั้งหมดของศูนย์) กับที่ส่งมา ต้องเท่ากันเป๊ะ
- **กันแย่งคิว**: `claim` ใช้ `updateMany` แบบมีเงื่อนไข `status:WAITING, claimedByUserId:null` ใน where — ถ้า 2 กรรมการกดพร้อมกัน มีแค่ 1 คนที่ `count > 0` (atomic ที่ระดับ DB ไม่ใช่ optimistic lock ที่ต้อง retry)
- **1 กรรมการถือได้ทีละ 1 คิว**: เช็คก่อน claim ว่ามีคิวอื่นที่ตัวเอง `IN_PROGRESS` ค้างอยู่ไหม
- **Global scoring lock**: true → บันทึก/แก้คะแนนตรงถูกปิดทั้งระบบ ต้องผ่าน `ScoreEditRequest` แทน
- **Public queue ไม่รั่วข้อมูล**: ไม่มีคะแนน/หมายเหตุ/ชื่อกรรมการใน response

---

## 3. UI/UX & Design System

### 3.1 แนวคิดธีม
ธีมสี **"KMUTNB" (มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ)** — ใช้ **สีแสด (vermilion)** คู่กับ **ดำนุ่ม** ตามสีประจำมหาวิทยาลัย ปรัชญาการออกแบบ (จากคอมเมนต์ใน [app/globals.css](app/globals.css)):

- สีแสดเป็น **สีเน้นเท่านั้น** ไม่ถมพื้นที่ใหญ่ (ยกเว้น `.saed-gradient` ซึ่งตั้งใจให้เข้มพอผ่าน contrast 4.5:1 บนจอโปรเจกเตอร์)
- พื้นหลังเป็น **ครีมอุ่น** (`--background: #FBF7F2`) แทนขาวจัด, ตัวอักษรเป็น **ดำอมน้ำตาล** (`--ink-900: #241E1A`) แทนดำสนิท เพื่อลดอาการแสบตา
- รองรับ **dark mode อัตโนมัติ** ผ่าน `@media (prefers-color-scheme: dark)`

### 3.2 Design Tokens (CSS Custom Properties, Tailwind v4 `@theme inline`)

| กลุ่ม | Token | ค่า (light) | ใช้เมื่อ |
| --- | --- | --- | --- |
| สีแสด (ไล่เฉด) | `--saed-50` … `--saed-700` | `#FEF4EF` → `#A83D19` | ปุ่ม, ไฮไลต์, accent border |
| ดำนุ่ม (ตัวอักษร) | `--ink-900/700/500/300` | `#241E1A` → `#A2938A` | ข้อความหลัก/รอง/หมายเหตุ |
| พื้นผิว | `--background`, `--surface`, `--surface-sunken`, `--line` | `#FBF7F2`, `#FFFFFF`, `#F5EFE7`, `#EBE0D4` | พื้นหลังหน้า, การ์ด, เส้นแบ่ง |
| สถานะคิว | `--state-active-*`, `--state-queued-*`, `--state-done-*` | ส้มพาสเทล / ม่วงพาสเทล / เขียวพาสเทล | badge สถานะ WAITING/IN_PROGRESS/DONE |
| ตารางหมุนเวียน | `--grid-line`, `--grid-head`, `--grid-banner`, `--grid-cell` | โทนม่วง/ฟ้าอ่อน | `ScheduleGrid` component เลียนแบบกระดาษกำหนดการที่กรรมการคุ้นเคย |

โทนมืด (dark mode) แทนค่าเดียวกันในบล็อก `@media (prefers-color-scheme: dark)` ของ [app/globals.css](app/globals.css) — ไล่จากครีมอุ่นเป็นดำอุ่น (`--background: #1A1614`) ตัวอักษรกลับด้านเป็นครีมอ่อน

### 3.3 Typography
- ฟอนต์เดียวทั้งระบบ: **Noto Sans Thai** (Google Fonts ผ่าน `next/font/google`) — รองรับทั้ง subset `thai` และ `latin`
- ตั้งเป็น CSS variable `--font-noto-thai` แล้ว map เข้า Tailwind ผ่าน `--font-sans`

### 3.4 Component/Interaction Patterns
- **Touch target ≥ 44px** บนอุปกรณ์ที่ใช้นิ้วสัมผัส — ใช้ media query `(pointer: coarse)` (ไม่ใช่ screen-width breakpoint) เพราะอุปกรณ์ที่สำคัญคือแท็บเล็ตที่กรรมการอาจใช้หน้า `/committee`
- **การ์ด**: คลาส `.card-soft` ให้เงานุ่มโทนอุ่น (ไม่ใช้เงาเทา) เพื่อให้เข้ากับพื้นครีม
- **Backward-compatibility aliases**: มีชุดคลาส `kmutnb-*` (เช่น `.kmutnb-header-gradient`, `.kmutnb-card-gold-top`) ที่ map ไปยัง token ชุดใหม่ — เป็นของเดิมจากธีม navy/gold ก่อนหน้า คงไว้เพื่อไม่ต้องเขียนใหม่ 200+ class name ข้าม 14 ไฟล์; **โค้ดใหม่ควรใช้ชื่อ `ink-*`/`saed-*` โดยตรง ไม่ใช้ `kmutnb-*`** (ในระบบใหม่ควรตัดของเก่าทิ้งไปเลยเพราะไม่มี legacy ให้ compat ด้วยแล้ว)
- **Animations**: `slide-up`, `fade-in`, `pulse-gold`, `soft-pulse` — ใช้กับสถานะที่กำลังเปลี่ยน/อัปเดตแบบเรียลไทม์
- **Print mode**: หน้า `/mentor/print` ใช้ `@media print { .no-print { display: none } }` เพื่อซ่อน UI ที่ไม่เกี่ยวเวลาพิมพ์รายงาน
- **Scrollbar**: กำหนด custom `::-webkit-scrollbar` บาง (8px) ให้เข้ากับธีม แทน scrollbar เริ่มต้นของ OS
- Layout: หน้า `overflow-x: hidden` ที่ระดับ `html/body` — เนื้อหาที่กว้าง (เช่นตารางหมุนเวียน) ให้ scroll ภายในกล่องของตัวเอง ไม่ทำให้ทั้งหน้าเลื่อนซ้าย-ขวา

---

## 4. รูปแบบไฟล์นำเข้า/ส่งออก (Import/Export Formats)

### 4.1 นำเข้ารายชื่อนักเรียน — `POST /api/admin/students/import`

**รูปแบบไฟล์**: `.csv` หรือ `.xlsx` (ตรวจจากนามสกุลไฟล์) — [lib/student-import.ts](lib/student-import.ts)

**คอลัมน์ที่ต้องมี** (header row บรรทัดแรก, จับคู่แบบ fuzzy — normalize เป็นตัวพิมพ์เล็กและตัด non-letter ออกก่อนเทียบ ดังนั้น `School Code`, `schoolCode`, `school_code` ใช้แทนกันได้):
| คอลัมน์ | ต้องมีคำว่า | ตัวอย่างค่า |
| --- | --- | --- |
| รหัสศูนย์สอบ | `schoolcode` | `KMUTNB` |
| ลำดับนักเรียนในศูนย์ | `seqno` | `1` (ต้องเป็นจำนวนเต็ม 1-6) |
| ชื่อนักเรียน | `name` | `เด็กชาย...` |

**Validation rules** (`validateRows()`):
- `schoolCode` ต้อง match กับ `School.code` ที่มีอยู่จริงในระบบ (case-insensitive) ไม่งั้น error `ไม่พบโรงเรียนรหัส "XXX"`
- `seqNo` ต้องเป็นจำนวนเต็ม 1-6 ไม่งั้น error `seqNo ต้องเป็นจำนวนเต็ม 1-6`
- `name` ห้ามว่าง ไม่งั้น error `ต้องระบุชื่อ`
- `(schoolCode, seqNo)` ห้ามซ้ำกันภายในไฟล์เดียวกัน (ไม่ได้เช็คกับ DB เดิม เพราะเป็น upsert) ไม่งั้น error `seqNo X ซ้ำภายในโรงเรียนเดียวกัน...`
- `studentCode` ถูก generate อัตโนมัติ = `${seqNo}${school.code}` เช่น `1KMUTNB`

**Workflow 2 ขั้นตอน (สำคัญ — ต้องคงไว้)**:
1. ส่งไฟล์เดิมพร้อม `mode: "preview"` → parse + validate เฉย ๆ ไม่เขียน DB → คืน `{ rows: ParsedStudentRow[], validCount, errorCount }` ให้ผู้ใช้ดูตรวจก่อน
2. ส่ง**ไฟล์เดิมซ้ำอีกรอบ**พร้อม `mode: "commit"` → parse ใหม่ (ไม่แคชผลจาก preview) แล้ว `upsert` เฉพาะแถวที่ `ok:true` ทั้งหมดในธุรกรรมเดียว (`schoolId_seqNo` unique key) → คืน `{ imported: count }`
   - ถ้าไม่มีแถวถูกต้องเลย → `400 { error: "ไม่มีแถวที่ถูกต้องให้นำเข้า" }`

### 4.2 Export คะแนนรายบุคคล (CSV) — `GET /api/admin/scores/export` (ADMIN เท่านั้น)

CSV, UTF-8 with BOM (`﻿`) ให้ Excel เปิดภาษาไทยถูกต้อง, filename `tmo-scores-YYYY-MM-DD.csv`

คอลัมน์: `โรงเรียน, รหัส (school code), รหัสนักเรียน (studentCode), ชื่อนักเรียน, ข้อ (problemNumber), คะแนน, กรรมการ (displayName), username, เวลาบันทึก (ISO)`
เรียงตาม: ชื่อโรงเรียน → seqNo นักเรียน → หมายเลขข้อ

### 4.3 Export ตารางเวลา (CSV) — `GET /api/schedule/export` (public, ไม่ต้อง login)

CSV grid รูปแบบเดียวกับกระดาษกำหนดการที่แปะบนผนัง: แถว = ช่วงเวลา (`13:45-14:00`), คอลัมน์ = แต่ละข้อ (`ข้อ 1`...`ข้อ 5`), เซลล์ = school code ของศูนย์ที่ต้องมาพบข้อนั้นในช่วงเวลานั้น filename คงที่ `tmo-verification-schedule.csv`

### 4.4 Export รายงาน Mentor (Excel) — `GET /api/mentor/export` (role = MENTOR เท่านั้น)

ใช้ `exceljs` สร้าง `.xlsx` 1 sheet ชื่อ = ชื่อโรงเรียน (ตัดไม่เกิน 31 ตัวอักษร ตามข้อจำกัดของ Excel sheet name)

คอลัมน์: `รหัส (studentCode), ชื่อ, ข้อ 1, ข้อ 2, ข้อ 3, ข้อ 4, ข้อ 5, รวม` — 1 แถวต่อนักเรียน + แถวท้ายสุด "รวมทั้งโรงเรียน" (ตัวหนา, ผลรวมคะแนนทุกคนทุกข้อ)

**Data scope**: ดึงข้อมูลจาก `session.user.schoolId` เท่านั้น **ห้ามรับ schoolId จาก client เด็ดขาด** (comment ในโค้ดเน้นย้ำจุดนี้เป็นพิเศษ — เป็นจุดเสี่ยง IDOR ถ้าพลาด) — logic คำนวณอยู่ที่ [lib/advisor-report.ts](lib/advisor-report.ts)

filename เข้ารหัสแบบ RFC 5987 (`filename*=UTF-8''...`) เพราะชื่อโรงเรียนเป็นภาษาไทย ใช้ใน `Content-Disposition` แบบ plain ไม่ได้

---

## 5. หน้าจอ & User Flow ตาม Role

### 5.1 Public (ไม่ต้อง login)

| หน้า | หน้าที่ | Flow |
| --- | --- | --- |
| `/display` | จอฉายโปรเจกเตอร์ (TV/monitor, เปิดค้างไว้ทั้งวันไม่มีคนคุม) | โหลด `/api/queue` (SSE auto-refresh) → แสดง **การ์ด "กำลังตรวจอยู่" 1 ใบต่อข้อ** (5 การ์ด) โชว์ศูนย์ที่กำลังถูกตรวจ/คิวถัดไปของแต่ละข้อ พร้อมนาฬิกาเรียลไทม์ (tick ทุกวินาที) + grid ตารางหมุนเวียนของ slot ที่ยังไม่จบ (ไม่เกิน 6 แถวถัดไป) — ไม่มีปุ่มกด ไม่มี navigation, ใช้ font-size แบบ `clamp()` ให้ปรับตามขนาดจออัตโนมัติ (จอ 20" ถึง TV 85") |
| `/queue` | คิวสาธารณะแบบละเอียด (ให้คนดูจากมือถือ/แท็บเล็ตนอกห้อง) | คล้าย `/display` แต่เป็น list/table แบบละเอียดกว่า ไม่ใช่จอฉาย |
| `/login` | เข้าสู่ระบบ | กรอก username/password → submit ผ่าน NextAuth Credentials → สำเร็จ redirect ตาม role (ADMIN→`/admin`, COMMITTEE→`/committee`, MENTOR→`/mentor`) หรือกลับไป `callbackUrl` เดิมถ้ามี |

### 5.2 Committee (`/committee`)

หน้าเดียว แบ่งเป็น 4 โซนตามสถานะ ดึงข้อมูลจาก `GET /api/queue/mine` (live-updating ผ่าน SSE):

1. **"กำลังตรวจอยู่"** — ถ้ามีคิวที่ตัวเอง claim ค้างอยู่ (`status:IN_PROGRESS` + เป็นเจ้าของ) โชว์ชื่อศูนย์ + ปุ่ม "คืนคิว" + `ScoreForm` (grid input คะแนน 0-10 step 0.5 ของนักเรียนทุกคนในศูนย์นั้น) ถ้ายังไม่ได้ cla`อะไร โชว์ empty state "เลือกจากคิวรอตรวจด้านล่าง"
2. **"รอตรวจ"** — ตารางคิวที่ `status:WAITING` ของข้อที่ตัวเองรับผิดชอบ แต่ละแถวมีปุ่ม "รับตรวจ" (disabled ถ้าตัวเองถือคิวอื่นค้างอยู่แล้ว — บังคับ 1 คิวต่อครั้ง)
3. **"กรรมการท่านอื่นกำลังตรวจ"** — แสดงเฉย ๆ (read-only) ว่าใครกำลังตรวจอะไรอยู่บ้าง ไม่ใช่ของตัวเอง
4. **"ตรวจแล้ว"** — รายการที่ปิดคิวแล้ว (`status:DONE`) พร้อมยอดรวมคะแนน; ถ้า `scoringLocked = true` แต่ละคะแนนนักเรียนคลิกได้เพื่อเปิด modal "ขอแก้ไขคะแนน" (กรอกค่าใหม่ + เหตุผล → `POST /api/score-edit-requests`)

**Flow ให้คะแนน (happy path)**: รับตรวจ → กรอกคะแนนครบทุกคน (ปุ่ม submit disable จนกว่าจะครบ+อยู่ในช่วง 0-10) → กด "บันทึกและปิดคิวนี้" → คิวปิดอัตโนมัติ ย้ายไปโซน "ตรวจแล้ว" → กลับไปเลือกคิวถัดไปจาก "รอตรวจ"

**Error states ที่ UI ต้อง handle**: 403 ปิดรับคะแนนแล้ว (โชว์คำแนะนำให้ใช้ "ขอแก้ไขคะแนน" แทน), 403 ไม่ได้ถือคิวนี้อยู่, 409 คิวถูกคนอื่นชิงไปก่อน, 409 ถือคิวอื่นค้างอยู่แล้ว

### 5.3 Mentor (`/mentor`, `/mentor/print`)

| หน้า | หน้าที่ |
| --- | --- |
| `/mentor` | ตารางคะแนนนักเรียนทุกคนในศูนย์ตัวเอง (read-only) — คอลัมน์ รหัส/ชื่อ/ข้อ 1-5/รวม, แถวท้าย "คะแนนรวมทั้งโรงเรียน"; ปุ่ม "📊 Excel" (`/api/mentor/export`) และ "🖨️ PDF" (ลิงก์ไป `/mentor/print`) |
| `/mentor/print` | เวอร์ชันสำหรับพิมพ์ของตารางเดียวกัน — ใช้ `@media print { .no-print { display:none } }` ซ่อน header/ปุ่มต่าง ๆ เหลือแต่ตาราง, มีปุ่ม `PrintButton` เรียก `window.print()` |

ไม่มี flow แก้ไขข้อมูลใด ๆ — mentor เป็น read-only ทั้งหมด, scope ผูกกับ `session.user.schoolId` ที่ฝังมาตอน login เท่านั้น

### 5.4 Admin (`/admin/*`)

| หน้า | หน้าที่ | Flow หลัก |
| --- | --- | --- |
| `/admin` (dashboard) | ภาพรวมระบบ | Stat cards (รอตรวจ/กำลังตรวจ/ตรวจแล้ว/จำนวนโรงเรียน/กรรมการ/นักเรียน/กรอกคะแนนครบแล้ว/คำขอแก้ไขค้าง) + ปุ่ม lock/unlock คะแนนทั้งระบบ (มี `confirm()` dialog ก่อนสลับ) + **"Stale Items Alert"**: แจ้งเตือนรายการที่ค้างสถานะ `IN_PROGRESS` เกิน **30 นาที** (คำนวณจาก `claimedAt`) — เดาว่ากรรมการ claim แล้วไม่ได้ส่งคะแนน มีลิงก์ไปหน้าจัดการคิวให้ force-release |
| `/admin/schools` | จัดการโรงเรียน | เพิ่ม/แก้ไข/ลบ (`SchoolManager`) — ลบไม่ได้ถ้ายังมีคิวค้างของศูนย์นั้น (`409`) |
| `/admin/committee` | จัดการกรรมการ | สร้างบัญชีใหม่ (username+password≥8+มอบหมายข้อ), แก้ไขการมอบหมายข้อ/reset password, ลบ (ลบ ADMIN ไม่ได้) |
| `/admin/students` | จัดการนักเรียน + นำเข้า | รายชื่อ + ลบทีละคน (`StudentList`) และฟอร์มนำเข้าไฟล์ (`StudentImportManager`, ดู flow เต็มด้านล่าง) |
| `/admin/queue` | จัดการคิว | ฟอร์มเพิ่มรายการ (เลือกโรงเรียน+ข้อ), filter ตามข้อ, ตารางแสดงลำดับ/สถานะ/ผู้ถือ พร้อมปุ่ม ↑/↓ สลับลำดับ (swap position กับ neighbour), force-release, ลบ (มี `confirm()`) |
| `/admin/scores` | ดู/export คะแนน | ตาราง + ปุ่ม export CSV |
| `/admin/score-edit-requests` | อนุมัติคำขอแก้ไข | การ์ดต่อคำขอ: โชว์ค่าเดิม→ค่าใหม่ (ขีดทับ/ลูกศร) + เหตุผล + ปุ่ม "อนุมัติ" (เขียน `Score` จริง + audit log) / "ปฏิเสธ" |
| `/admin/audit-log` | ดูประวัติการแก้ไขทั้งหมด | read-only list ของ `AuditLog` |

**Flow นำเข้ารายชื่อนักเรียน (2 ขั้นตอน UI)**:
1. เลือกไฟล์ `.csv`/`.xlsx` → กด "👀 ดูตัวอย่าง" → เรียก API `mode:preview` → โชว์ตารางทุกแถวพร้อมผลตรวจ (แถวถูกต้อง = highlight ปกติ + studentCode ที่จะได้, แถวผิด = พื้นแดง + ข้อความ error)
2. ถ้ามีแถวถูกต้อง ≥ 1 → กด "✅ ยืนยันนำเข้า N รายการ" → เรียก API ซ้ำด้วยไฟล์เดิมแต่ `mode:commit` → โชว่ toast "นำเข้าสำเร็จ N รายการ" แล้วรีเฟรชตารางนักเรียน

**Flow ปิด/เปิดรับคะแนนทั้งระบบ**: กดปุ่มที่ dashboard → `confirm()` เตือนผลกระทบ (ถ้าปิด: "กรรมการจะบันทึกคะแนนใหม่ตรง ๆ ไม่ได้อีก") → ยืนยัน → `PATCH /api/admin/settings/lock` → หน้ารีเฟรช badge สถานะเปลี่ยนทันที

---

## 6. Non-Functional Requirements

- **Scale**: ผู้ใช้พร้อมกันน้อย — 16 ศูนย์, กรรมการ 5 คน, แอดมิน 1-2 คน, mentor ต่อศูนย์ 1 คน, public viewer (จอฉาย/มือถือดูคิว) ไม่จำกัดจำนวนแต่เป็น read-only เท่านั้น → ระบบไม่ต้องออกแบบเผื่อ concurrent write สูง แต่ **ต้องกัน race condition ที่จุดเดียวที่มีการแย่งกันจริง** คือ "claim คิว" (ดูหัวข้อ 2.6)
- **Realtime latency**: การเปลี่ยนสถานะคิว (claim/release/score) ต้องสะท้อนไปที่จอสาธารณะ/บอร์ดกรรมการคนอื่นภายใน **ไม่กี่วินาที** ไม่ใช่ต้องกด refresh เอง —ของเดิมใช้ SSE push + fallback poll 1 วิ (ดูหัวข้อ 2.3), ระบบใหม่จะใช้กลไกไหนก็ได้ (WebSocket, Postgres LISTEN/NOTIFY ของจริงถ้า infra รองรับ, หรือ SSE เดิม) ขอแค่ latency อยู่ในระดับนี้
- **Stale-claim detection**: ต้องมีกลไกแจ้งเตือนแอดมินถ้ามีคิวที่ถูก claim (`IN_PROGRESS`) ค้างเกิน **30 นาที** โดยไม่ปิด — เผื่อกรณีกรรมการลืม/เครื่องหลุดกลางทาง เพื่อให้แอดมิน force-release ได้ทัน (ของเดิมคำนวณตอน render หน้า dashboard ไม่ใช่ cron job)
- **Availability**: ระบบต้องใช้งานได้ตลอดวันแข่งขัน (หลายชั่วโมงต่อเนื่อง) จอ `/display` ต้องเปิดค้างได้ทั้งวันโดยไม่ค้าง/ไม่ leak memory (SSE connection ต้องมี heartbeat กันถูกตัดโดย proxy — ของเดิมทุก 25 วิ)
- **Device support**: กรรมการอาจใช้ **แท็บเล็ต** ที่หน้า `/committee` ระหว่างตรวจ → ทุก interactive element ต้องมี touch target ≥ 44×44px (ดูหัวข้อ 3.4); จอฉาย `/display` ต้องอ่านได้ทั้งจอเล็ก (มือถือเช็คจากข้างนอกห้อง) ถึงจอใหญ่ (TV 85")
- **Localization**: ภาษาไทยเท่านั้น ไม่ต้องรองรับหลายภาษา (ไม่มี i18n framework) — แต่ทุกไฟล์ export/import ต้องรองรับ UTF-8 + BOM ให้ Excel เปิดภาษาไทยถูกต้อง (จุดที่พลาดง่ายถ้าเปลี่ยน library export)
- **ความถูกต้องของคะแนน สำคัญกว่าความเร็ว**: ทุก mutation ที่กระทบ `Score` ต้องอยู่ใน DB transaction เดียวกับ `AuditLog` เสมอ ไม่มีทางเขียนคะแนนที่ข้าม audit ได้ไม่ว่าจะผ่าน endpoint ไหน (ดูหัวข้อ 2.2, 2.5)
- **Data integrity ที่ระดับ DB ไม่ใช่แค่ app-level**: ช่วงคะแนน 0.00-10.00 บังคับด้วย CHECK constraint ในตัว DB เอง (ไม่ใช่แค่ validate ที่ API) กัน data corrupt จากการเขียนตรงหรือ bug ที่ลอดผ่าน validation ชั้น app — ควรคงหลักการนี้ไว้ (defense in depth ที่ DB layer) ไม่ว่าจะใช้ DB/ORM ตัวไหนใหม่
- **ความปลอดภัยของ credential**: รหัสผ่าน hash ด้วย bcrypt เท่านั้น ห้ามเก็บ plain text แม้ในสภาพแวดล้อม dev/demo
- **ไม่ต้องรองรับ offline** — ระบบ assume มีเน็ตในสถานที่จัดแข่งขันตลอด ไม่มี requirement เรื่อง offline-first/PWA

---

## 7. Test Accounts / Role Matrix

จาก [prisma/seed.ts](prisma/seed.ts) — รหัสผ่านทุกบัญชี **`password123`**

| Username | Role | Scope | หน้าแรกหลัง login |
| --- | --- | --- | --- |
| `admin` | ADMIN | ทั้งระบบ | `/admin` |
| `committee1` | COMMITTEE | ตรวจข้อ 1 ของทุกศูนย์ | `/committee` |
| `committee2` | COMMITTEE | ตรวจข้อ 2 ของทุกศูนย์ | `/committee` |
| `committee3` | COMMITTEE | ตรวจข้อ 3 ของทุกศูนย์ | `/committee` |
| `committee4` | COMMITTEE | ตรวจข้อ 4 ของทุกศูนย์ | `/committee` |
| `committee5` | COMMITTEE | ตรวจข้อ 5 ของทุกศูนย์ | `/committee` |
| `mentor1` | MENTOR | เห็นเฉพาะศูนย์แรกในลิสต์ (`SCHOOLS[0]`) | `/mentor` |

**Route protection matrix** (จาก [proxy.ts](proxy.ts)):

| Path prefix | ต้องเป็น role | ถ้าไม่ตรง |
| --- | --- | --- |
| `/admin/*` | ADMIN | redirect ไปหน้า home ของ role ตัวเอง |
| `/committee/*` | COMMITTEE | เช่นเดียวกัน |
| `/mentor/*` | MENTOR | เช่นเดียวกัน |
| ไม่ login เลย | — | redirect `/login?callbackUrl=<path เดิม>` |

**ทดสอบ scope ที่ต้องคุมให้ผ่านในระบบใหม่**: mentor1 ต้อง export/ดูได้เฉพาะศูนย์ที่ผูกกับ `schoolId` ของตัวเองเท่านั้น แม้จะพยายามยิง API ตรง ๆ ด้วย schoolId อื่นก็ต้องถูกปฏิเสธ (endpoint ไม่รับ schoolId จาก client อยู่แล้วตามข้อ 4.4)

---

## 8. Known Limitations / Roadmap (จาก README เดิม — พิจารณาแก้ตั้งแต่ต้นถ้าทำใหม่)

ปัญหาเชิงโครงสร้างที่ควร **ตัดสินใจใหม่ตั้งแต่ตอนออกแบบ schema** แทนที่จะแก้ทีหลังแบบระบบเดิม:

1. **ไม่รองรับตรวจซ้ำโดยกรรมการหลายคนแล้วเฉลี่ยคะแนน**
   - สาเหตุ: unique key ของ `Score` คือ `(studentId, queueItemId)` **ไม่รวม `judgeId`** → นักเรียน 1 คนมีคะแนนได้ค่าเดียวต่อ queueItem ไม่ว่าใครบันทึก คนหลังบันทึกทับคนแรกได้เลย
   - ถ้าระบบใหม่อยากให้กรรมการหลายคนให้คะแนนแยกกันแล้วเฉลี่ย ต้องเพิ่ม `judgeId` กลับเข้า unique key (`studentId + queueItemId + judgeId`) และออกแบบ UI/สรุปคะแนนใหม่ทั้งหมด (ต้องมี aggregation layer แยกจาก raw score)

2. **ไม่รองรับ rubric คะแนนย่อยรายขั้นตอนพิสูจน์**
   - ตอนนี้คะแนนละเอียดถึงระดับ "นักเรียน 1 คน ต่อ 1 ข้อ" (ตาราง `Score`) แต่ยังเป็นค่าเดียว (0-10) ต่อคน ไม่แยกคะแนนย่อยตามขั้นตอนการพิสูจน์ในข้อเดียวกัน
   - ถ้าต้องการ ต้องเพิ่มตาราง `ScoreDetail` เป็นลูกของ `Score` (1-to-many) แล้วปรับ `ScoreForm`/API ให้รับ array ของคะแนนย่อยแทนค่าเดียว

3. **ไม่มี API token สำหรับ external script/automation**
   - ปัจจุบันพึ่ง session cookie ของเบราว์เซอร์เท่านั้น (ในระบบใหม่คือ JWT ผ่าน BFF cookie — ดูหัวข้อ 2.2) ไม่มีกลไก API key/token แยกสำหรับ machine-to-machine
   - ถ้าอยากให้ script ภายนอกเรียก NestJS API ได้ตรง ๆ (เช่น sync คะแนนไปประกาศผลอัตโนมัติ) ต้องออกแบบ token scheme เพิ่ม (เช่น API key แยกต่างหากจาก JWT ของผู้ใช้) — ระบบยังไม่มีช่องโหว่จาก ID เดาได้เพราะเลือกใช้ `UNIQUEIDENTIFIER` (GUID) แทน auto-increment ทุกตารางแล้ว (ดูหัวข้อ 1.3) จึงยังไม่จำเป็นสำหรับใช้งานในเบราว์เซอร์ปกติ แต่จำเป็นถ้าจะเปิด API ให้ระบบอื่นเรียก

4. **ไม่มีลายน้ำระบุตัวตนบนหน้าจอ/export** — เคยมีแล้วถอดออกตามคำขอผู้ใช้เดิม พิจารณาใหม่ว่าจำเป็นไหม

5. **ยังไม่เคยทดสอบบนอุปกรณ์มือถือ/แท็บเล็ตจริง** — โดยเฉพาะหน้า `/committee` ที่กรรมการอาจใช้แท็บเล็ต และฟอร์มกรอกคะแนน 6 คนบนจอเล็ก — ทดสอบแค่ responsive simulation ในเบราว์เซอร์เท่านั้น ควรทำ device testing จริงก่อนใช้งานจริง

6. **ไม่มีชุด automated tests เลย** — จุดที่ความเสี่ยงสูงสุดถ้าไม่มี regression test คุ้มครอง (ควรเขียน test ให้ครบก่อนถือว่า rewrite เสร็จ):
   - กลไกกันแย่งคิว (concurrent claim race condition)
   - การกรองสิทธิ์ตามหมายเลขข้อที่กรรมการแต่ละคนได้รับมอบหมาย
   - การบล็อกไม่ให้ปิดคิวถ้ากรอกคะแนนไม่ครบ 6 คน
   - MENTOR ต้องเห็น/export ได้เฉพาะโรงเรียนตัวเอง (IDOR check)
   - scoring lock ต้องบล็อกการบันทึกคะแนนตรงจริง ๆ และ edit-request flow ต้องทำงานถูกทาง

---

## 9. Data Backup

ข้อมูลจริงทั้งหมดจากระบบเดิม (`tmo` บน **PostgreSQL** local) ถูก dump ไว้ที่:

- [backup/tmo_db_backup_20260922_220400.sql](backup/tmo_db_backup_20260922_220400.sql) — full schema + data (`pg_dump`, plain SQL format) ครอบคลุมทุกตาราง: `School` (รายชื่อ 16 ศูนย์สอบจริง ณ ตอนนี้), `Student`, `User`, `CommitteeAssignment`, `QueueItem`, `Score`, `CompetitionSettings`, `ScoreEditRequest`, `AuditLog`

**⚠️ ไฟล์นี้เป็น PostgreSQL dump ใช้กับ MSSQL โดยตรงไม่ได้** (`psql`/`createdb` เป็นเครื่องมือของ Postgres) เนื่องจากระบบใหม่ย้ายไป **MSSQL** ต้องแปลงข้อมูลก่อนนำเข้า มี 2 แนวทาง:

1. **Restore ไป Postgres ชั่วคราวก่อน** (`createdb tmo && psql -U postgres -d tmo -f backup/tmo_db_backup_....sql`) แล้วใช้เครื่องมือ migrate เช่น **SQL Server Migration Assistant (SSMA) for PostgreSQL** หรือ export เป็น CSV ต่อตารางแล้ว `BULK INSERT`/`bcp` เข้า MSSQL ตาม schema ใหม่ (หัวข้อ 2.1)
2. **เขียน script แปลงเอง** (แนะนำถ้าข้อมูลไม่เยอะ — 16 ศูนย์ ~96 นักเรียน): อ่านค่าจาก Postgres (หรือ parse จากไฟล์ `.sql` นี้ตรง ๆ) แล้ว `INSERT` เข้า MSSQL ผ่าน `mssql` driver โดย generate `UNIQUEIDENTIFIER` ใหม่แทน `cuid()` เดิม (ต้อง remap FK ทุกจุดที่อ้าง id เดิมให้ตรงกับ GUID ใหม่)

**หมายเหตุ**: ไม่ว่าจะใช้แนวทางไหน ต้อง validate ว่า CHECK constraint ใหม่ (`Value BETWEEN 0.00 AND 10.00`, enum-as-VARCHAR) ไม่ reject แถวเดิมที่มีอยู่ก่อน insert จริง
