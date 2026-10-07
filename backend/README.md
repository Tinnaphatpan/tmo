# TMO Grading Queue — Backend API (NestJS)

Backend API สำหรับระบบจัดการคิวตรวจข้อสอบการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติ (Thailand Mathematical Olympiad - TMO) พัฒนาด้วย **NestJS 11**, **TypeScript** และเชื่อมต่อกับ **Microsoft SQL Server (MSSQL)** โดยใช้สถาปัตยกรรม **Clean Architecture** โดยไม่มี ORM

---

## สารบัญ

- [1. สถาปัตยกรรมระบบ (Architecture)](#1-สถาปัตยกรรมระบบ-architecture)
- [2. โครงสร้างโฟลเดอร์ (Directory Structure)](#2-โครงสร้างโฟลเดอร์-directory-structure)
- [3. การจัดการฐานข้อมูล (Database & Migrations)](#3-การจัดการฐานข้อมูล-database--migrations)
- [4. การตั้งค่าสภาพแวดล้อม (Environment Variables)](#4-การตั้งค่าสภาพแวดล้อม-environment-variables)
- [5. โมดูลและ Endpoint API ทั้งหมด (Modules & Endpoints)](#5-โมดูลและ-endpoint-api-ทั้งหมด-modules--endpoints)
- [6. กลไกความปลอดภัยและความถูกต้องของข้อมูล (Integrity & Security)](#6-กลไกความปลอดภัยและความถูกต้องของข้อมูล-integrity--security)
- [7. ระบบใบคะแนน PDF และลายเซ็นอิเล็กทรอนิกส์ (PDF & E-Signature)](#7-ระบบใบคะแนน-pdf-และลายเซ็นอิเล็กทรอนิกส์-pdf--e-signature)
- [8. การติดตั้งและเริ่มต้นใช้งาน (Installation & Setup)](#8-การติดตั้งและเริ่มต้นใช้งาน-installation--setup)
- [9. คำสั่งทั้งหมดในระบบ (Available Scripts)](#9-คำสั่งทั้งหมดในระบบ-available-scripts)
- [10. การทดสอบ (Testing)](#10-การทดสอบ-testing)

---

## 1. สถาปัตยกรรมระบบ (Architecture)

Backend ยึดหลัก **Clean Architecture**: `Controller → Use Case → Domain → Repository` อย่างเคร่งครัด:

```
[ HTTP Request ]
       ↓
[ Controller ]       → DTO Validation (class-validator) & Route Auth Guards
       ↓
[ Use Case ]         → Business Logic ทั้งหมด (Unit test ผ่าน In-Memory Fake Repositories)
       ↓
[ Repository ]       → คำสั่ง SQL แบบ Parameterized Query ผ่านโมดูล mssql (tedious)
       ↓
[ MSSQL Database ]
```

### จุดเด่นเชิงสถาปัตยกรรม
1. **No ORM**: ใช้ Raw SQL แบบ Parameterized Queries 100% ปราศจากปัญหา Performance และ Abstraction Leaks ของ ORM
2. **Double Verification Auth**:
   - `AuthGuard` ตรวจสอบและถอดรหัส JWT Token
   - `RolesGuard` ตรวจสอบสถานะและบทบาทผู้ใช้สดจากฐานข้อมูลจริงทุกๆ Request (ป้องกันปัญหาบทบาทใน Token ค้างเมื่อ Admin มีการเปลี่ยน Role หรือสิทธิ์ของผู้ใช้)
3. **Atomic Score Transactions**: ทุกการบันทึกหรือแก้ไขคะแนนต้องทำควบคู่กับการบันทึก `AuditLog` ภายใน Transaction เดียวกันผ่าน `TransactionRunner` เสมอ
4. **Hardware/Storage Abstraction**: มี `FileStorage` interface (`src/common/file-storage.ts`) รองรับการจัดเก็บไฟล์ PDF และรูปลายเซ็น ทำให้สามารถ Mock ได้ 100% ใน Unit Test

---

## 2. โครงสร้างโฟลเดอร์ (Directory Structure)

```
backend/
├── migrations/                # ไฟล์ SQL Migration เรียงลำดับ (001 - 004)
│   ├── 001_init.sql           # Schema หลัก (School, User, Queue, Student, Score ฯลฯ)
│   ├── 002_team_leader_staff_roles.sql # ปรับ Role MENTOR->TEAM_LEADER และเพิ่ม STAFF
│   ├── 003_user_assignment.sql# ขยายสิทธิ์ UserAssignment (วิชา + ศูนย์สอบ)
│   └── 004_score_approval.sql # ระบบ Workflow อนุมัติคะแนนและบันทึก PDF
├── scripts/                   # สคริปต์ทดสอบและเครื่องมือช่วยเหลือ
│   ├── check-db.ts            # ตรวจสอบการเชื่อมต่อฐานข้อมูลตาม .env
│   ├── concurrency-test.mjs   # ทดสอบ Concurrency ในการแย่ง Claim คิว
│   └── create-test-committee-with-done-item.ts
├── src/
│   ├── auth/                  # JWT Strategy, AuthGuard, RolesGuard, @Roles()
│   ├── common/                # FileStorage, Global Exception Filters, Decorators
│   ├── config/                # AppConfig & Joi/Validation schemas
│   ├── database/              # DatabaseModule, TransactionRunner, Migration & Seed
│   ├── domain/                # Entity definitions (User, QueueItem, Score, ฯลฯ)
│   ├── modules/
│   │   ├── admin/             # จัดการผู้ใช้, โรงเรียน, นักเรียน, คิว, ตารางหมุนเวียน
│   │   ├── approval/          # อนุมัติใบคะแนนและสร้าง PDF
│   │   ├── audit-log/         # ประวัติการทำงานในระบบ
│   │   ├── queue/             # คิวตรวจข้อสอบ, Claim, Skip, Release, Next
│   │   ├── realtime/          # Server-Sent Events (SSE) Stream
│   │   ├── schedule/          # ส่งออกตารางการแข่งขัน
│   │   ├── schools/           # ข้อมูลศูนย์สอบ/โรงเรียน
│   │   ├── scoreboard/        # สรุปคะแนนรวม
│   │   ├── scores/            # จัดการคะแนนและคำขอแก้ไขคะแนน
│   │   ├── settings/          # ล็อก/ปลดล็อกระบบบันทึกคะแนน
│   │   ├── students/          # ข้อมูลนักเรียน
│   │   ├── team-leader/       # จัดการคำขอแก้ไขคะแนนและรายงานหัวหน้าทีม
│   │   ├── user-assignment/   # การมอบหมายวิชาและศูนย์สอบ
│   │   └── users/             # ข้อมูลผู้ใช้งานระบบ
│   └── testing/               # In-Memory Fake Repositories และ API Test Harness
├── storage/                   # โฟลเดอร์เก็บไฟล์ (PDFs, ลายเซ็น)
├── .env                       # Environment Configuration
├── .env.example               # ตัวอย่างการตั้งค่า Environment
└── package.json
```

---

## 3. การจัดการฐานข้อมูล (Database & Migrations)

ระบบใช้ **Microsoft SQL Server (2019+)** และจัดการ Schema ผ่าน Migration Runner ภายในโค้ด (`src/database/migrate.ts`) โดยมีตาราง `dbo._migrations` ทำหน้าที่บันทึกประวัติการรัน

### ลำดับการ Migration
1. **`001_init.sql`**:
   - `School`: ศูนย์สอบ (Id, Name, Code)
   - `[User]`: บัญชีผู้ใช้ (Id, Username, DisplayName, PasswordHash, Role, SchoolId)
   - `CommitteeAssignment`: สิทธิ์กรรมการ (UserId, ProblemNumber)
   - `QueueItem`: คิวตรวจข้อสอบ (Id, SchoolId, ProblemNumber, Status, Position, ScheduledAt, ClaimedByUserId, ClaimedAt, CompletedAt)
   - `Student`: ข้อมูลนักเรียน (Id, StudentCode, SeqNo, Name, SchoolId) — กำหนด 6 คนต่อศูนย์
   - `Score`: คะแนน (Id, StudentId, QueueItemId, Value, JudgeId, CreatedAt, UpdatedAt) — บังคับ `Value BETWEEN 0.00 AND 10.00`
   - `CompetitionSettings`: ตาราง Singleton สำหรับสถานะการล็อกคะแนน (`Id = 1`, `ScoringLocked`)
   - `ScoreEditRequest`: คำขอแก้คะแนน (Id, ScoreId, RequestedBy, OldValue, NewValue, Reason, Status, ReviewedBy, ReviewedAt)
   - `AuditLog`: ประวัติการทำงาน (Id, Action, EntityType, EntityId, OldValue, NewValue, PerformedBy, CreatedAt)
2. **`002_team_leader_staff_roles.sql`**:
   - เปลี่ยน `MENTOR` เป็น `TEAM_LEADER`
   - เพิ่ม Role `STAFF`
   - เพิ่มฟิลด์ `SignaturePath` ในตาราง `User` สำหรับเก็บที่อยู่ไฟล์รูปลายเซ็น
3. **`003_user_assignment.sql`**:
   - เปลี่ยนชื่อตารางเป็น `UserAssignment`
   - เพิ่มฟิลด์ `SchoolId` เพื่อรองรับการระบุศูนย์สอบสำหรับ `STAFF` (หากเป็น `NULL` หมายถึงตรวจได้ทุกศูนย์สำหรับข้อนั้น)
4. **`004_score_approval.sql`**:
   - เพิ่มฟิลด์ `SubmittedByUserId` ใน `QueueItem`
   - เพิ่มฟิลด์ `ApprovalStatus` (`NOT_SUBMITTED`, `PENDING`, `APPROVED`)
   - เพิ่มฟิลด์ `ApprovedByUserId`, `ApprovedAt` และ `DocumentPath` (ตำแหน่งจัดเก็บ PDF)

---

## 4. การตั้งค่าสภาพแวดล้อม (Environment Variables)

กำหนดค่าในไฟล์ `.env` ที่โฟลเดอร์ `backend/`:

```env
# Application Server
PORT=4000
NODE_ENV=development

# Database Connection (MSSQL)
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=TmoGradingQueue
DB_USER=tmo_app
DB_PASSWORD=TmoDev_2026!Strong
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Connection Pool Settings
DB_POOL_MIN=2
DB_POOL_MAX=10

# Authentication (JWT)
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=12h
BCRYPT_SALT_ROUNDS=10

# Storage Paths (PDF & E-Signatures)
PDF_STORAGE_DIR=./storage/pdfs
SIGNATURE_STORAGE_DIR=./storage/signatures
```

---

## 5. โมดูลและ Endpoint API ทั้งหมด (Modules & Endpoints)

### 5.1 Authentication (`/auth`)
- `POST /auth/login` — เข้าสู่ระบบ รับ `username` และ `password` ส่งกลับ JWT Token
- `GET /auth/me` — ตรวจสอบข้อมูลผู้ใช้และบทบาทปัจจุบันจากฐานข้อมูลสด

### 5.2 Public & Queue Monitoring (`/queue`)
- `GET /queue` — ดึงข้อมูลภาพรวมคิวทั้งหมด (สำหรับตารางแสดงผลสาธารณะ)
- `GET /queue/stream` — เชื่อมต่อ Server-Sent Events (SSE) รับ Event `ready`, `changed`, `ping`
- `GET /queue/export` — ส่งออกข้อมูลคิวเป็นไฟล์ CSV

### 5.3 กรรมการและเจ้าหน้าที่ตรวจข้อสอบ (`/queue` สำหรับ `COMMITTEE` และ `STAFF`)
- `GET /queue/mine` — ดึงรายการคิวที่ได้รับมอบหมายตามสิทธิ์ (รายวิชาและศูนย์สอบ)
- `POST /queue/:id/claim` — ดึงคิวมาตรวจ (เปลี่ยนสถานะเป็น `IN_PROGRESS`)
- `POST /queue/:id/release` — สละสิทธิ์คิวที่กำลังตรวจกลับไปเป็น `WAITING`
- `POST /queue/:id/skip` — ข้ามคิว (สละสิทธิ์และย้ายคิวไปต่อท้ายสุดของข้อนั้น)
- `POST /queue/:id/score` — บันทึกคะแนนนักเรียนครบ 6 คน และส่งเข้าสู่สถานะ `PENDING` Approval
- `POST /queue/:id/edit-request` — ส่งคำขอแก้ไขคะแนนไปยังหัวหน้าทีม
- `GET /scoreboard` — ดูตารางสรุปคะแนนรวมทุกศูนย์

### 5.4 หัวหน้าทีม (`/team-leader`)
- `GET /team-leader/approvals` — ดูรายการใบคะแนนที่รออนุมัติของศูนย์สอบตนเอง
- `POST /team-leader/approvals/:id/approve` — ยืนยันอนุมัติคะแนน (ปั๊มลายเซ็นและสร้างไฟล์ PDF)
- `GET /team-leader/approvals/:id/pdf` — ดาวน์โหลดไฟล์เอกสาร PDF ใบคะแนนที่ได้รับการอนุมัติแล้ว
- `GET /team-leader/score-edit-requests` — ดูคำขอแก้ไขคะแนนของศูนย์สอบตนเอง
- `POST /team-leader/score-edit-requests/:id/review` — อนุมัติหรือปฏิเสธคำขอแก้ไขคะแนน (หากอนุมัติจะ Regenerate PDF ใหม่อัตโนมัติ)
- `GET /team-leader/report` — รายงานสรุปคะแนนประจำศูนย์สอบ

### 5.5 ผู้ดูแลระบบ (`/admin`)
- **จัดการสิทธิ์และผู้ใช้**:
  - `GET /admin/permissions` — ดู Matrix ผู้ใช้ สิทธิ์ และสถานะลายเซ็นทั้งหมด
  - `POST/PATCH/DELETE /admin/committee` — จัดการบัญชีกรรมการ
  - `POST/PATCH/DELETE /admin/staff` — จัดการบัญชีเจ้าหน้าที่และขอบเขตศูนย์สอบ
  - `POST/PATCH/DELETE /admin/team-leaders` — จัดการบัญชีหัวหน้าทีม
  - `PATCH /admin/users/:id/role` — เปลี่ยนบทบาทผู้ใช้ (Admin ปรับสิทธิ์ข้าม Role ได้ทันที)
  - `POST /admin/users/:id/signature` — อัปโหลดรูปภาพลายเซ็นอิเล็กทรอนิกส์ของผู้ใช้
- **จัดการคิวและการแข่งขัน**:
  - `POST /admin/queue/generate` — สร้างตารางหมุนเวียนคิวอัตโนมัติ (16 ศูนย์ × 5 ข้อ, ช่องละ 15 นาที)
  - `PATCH /admin/queue/:id` — แก้ไขรายละเอียดคิว (ศูนย์, ข้อสอบ, เวลา)
  - `DELETE /admin/queue/:id` — ลบรายการคิว
  - `POST /admin/queue/reset` — ล้างข้อมูลคะแนนและรีเซ็ตคิวกลับสู่สถานะเริ่มต้น (ป้องกันในโหมด Production)
- **จัดการโรงเรียนและนักเรียน**:
  - `GET/POST/PATCH/DELETE /admin/schools` — จัดการศูนย์สอบ/โรงเรียน
  - `POST /admin/students/import` — นำเข้ารายชื่อนักเรียนจากไฟล์ CSV/Excel
- **ควบคุมระบบและ Audit**:
  - `POST /admin/settings/lock` — ล็อกระบบบันทึกคะแนน
  - `POST /admin/settings/unlock` — ปลดล็อกระบบบันทึกคะแนน
  - `GET /admin/audit-log` — เรียกดูประวัติการทำรายการทั้งหมด

---

## 6. กลไกความปลอดภัยและความถูกต้องของข้อมูล (Integrity & Security)

1. **SQL-Level Race Condition Prevention**:
   การแย่ง Claim คิวตรวจข้อสอบใช้คำสั่ง Atomic Update ในระดับฐานข้อมูล ป้องกันไม่ให้เกิดการ Claim ซ้ำซ้อนแม้มี Request เข้ามาพร้อมกัน:
   ```sql
   UPDATE QueueItem
   SET Status = 'IN_PROGRESS', ClaimedByUserId = @userId, ClaimedAt = SYSUTCDATETIME()
   WHERE Id = @id AND Status = 'WAITING' AND ClaimedByUserId IS NULL;
   ```
2. **Atomic Score & Audit Transactions**:
   เมื่อมีการบันทึกคะแนนหรือแก้ไขคะแนน โมดูล `TransactionRunner` จะรันทั้งการเขียน `Score` และการบันทึก `AuditLog` ใน Transaction เดียวกัน หากขั้นตอนใดล้มเหลว จะเกิดการ Rollback ทั้งหมด
3. **คะแนนต้องอยู่ระหว่าง 0.00 ถึง 10.00**:
   ตรวจสอบทั้งในชั้น DTO และกำหนด `CHECK CONSTRAINT` ที่ฐานข้อมูล
4. **ป้องกันการปิดคิวเมื่อกรอกคะแนนไม่ครบ**:
   ระบบจะไม่ยอมให้ส่งคะแนน (Submit) หากมีนักเรียนคนใดในศูนย์นั้นยังไม่ได้บันทึกคะแนน

---

## 7. ระบบใบคะแนน PDF และลายเซ็นอิเล็กทรอนิกส์ (PDF & E-Signature)

- **เครื่องมือสร้างเอกสาร**: ใช้ `pdfkit`
- **การรองรับภาษาไทย**: ผนังฟอนต์ TrueType (`NotoSansThai-Regular.ttf`) จากแพ็กเกจ `@expo-google-fonts/noto-sans-thai` แสดงผลสระ วรรณยุกต์ และตัวอักษรไทยได้อย่างถูกต้อง
- **กระบวนการลงนาม**:
  1. Admin อัปโหลดไฟล์รูปลายเซ็น (`.png`/`.jpg`) ของผู้ใช้ไว้ล่วงหน้าผ่าน `POST /admin/users/:id/signature`
  2. เมื่อกรรมการ/เจ้าหน้าที่ส่งคะแนน คิวจะเข้าสู่สถานะ `PENDING`
  3. เมื่อ Team Leader ตรวจสอบและกดอนุมัติ ระบบจะดึงรูปลายเซ็นมาวางลงในเอกสาร PDF พร้อมระบุเวลาประทับตรา และจัดเก็บลงโฟลเดอร์ `storage/pdfs/`

---

## 8. การติดตั้งและเริ่มต้นใช้งาน (Installation & Setup)

### 8.1 การติดตั้ง Dependencies
```bash
cd backend
npm install
```

### 8.2 การเชื่อมต่อฐานข้อมูล SQL Server
1. ตรวจสอบให้แน่ใจว่า Windows Service `MSSQLSERVER` กำลังทำงานอยู่ (เปิดผ่าน `services.msc` หรือรัน `Start-Service MSSQLSERVER` ใน PowerShell ในฐานะ Administrator)
2. ทดสอบการเชื่อมต่อ:
   ```bash
   npm run check:db
   ```
3. รัน Migration เพื่อสร้างโครงสร้างตาราง:
   ```bash
   npm run migrate
   ```
4. ใส่ข้อมูลจำลองสำหรับการทดสอบ:
   ```bash
   npm run seed
   # หรือเตรียมข้อมูลครบชุด (Staff + Signatures + 16x5 คิว)
   npm run prepare:test
   ```

### 8.3 การรัน Development Server
```bash
npm run start:dev
# API จะพร้อมให้บริการที่ http://localhost:4000
```

---

## 9. คำสั่งทั้งหมดในระบบ (Available Scripts)

| คำสั่ง | คำอธิบาย |
|---|---|
| `npm run start:dev` | เริ่มรัน API Server ในโหมด Watch (Development) |
| `npm run start:prod` | เริ่มรัน API Server ที่ Build แล้ว (`dist/main.js`) |
| `npm run build` | Build โปรเจกต์ NestJS ด้วย TypeScript Compiler |
| `npm run check:db` | ตรวจสอบการเชื่อมต่อกับ SQL Server ตามไฟล์ `.env` |
| `npm run migrate` | รันไฟล์ Migration ที่ยังค้างอยู่เข้าฐานข้อมูล |
| `npm run seed` | ใส่ข้อมูลจำลองพื้นฐาน (Admin, Committee 1-5, Team Leader, 16 ศูนย์) |
| `npm run prepare:test` | สร้างข้อมูลทดสอบแบบครบวงจร (รวม Staff, ลายเซ็นตัวอย่าง, คิว 80 รายการ) |
| `npm run reset:test -- --yes` | **DESTRUCTIVE**: ล้างคะแนนและประวัติ รีเซ็ตคิวกลับสถานะ WAITING |
| `npm test` | รัน Unit Tests ทั้งหมดด้วย Jest (ใช้ In-Memory Fakes ไม่ต้องต่อ Database) |
| `npm run lint` | ตรวจสอบ Linting ด้วย `oxlint` |

---

## 10. การทดสอบ (Testing)

โปรเจกต์มีชุดการทดสอบครอบคลุมทุก Endpoint และ Use Case สำคัญ:
- **จำนวน Test Suites**: 33 Suites
- **จำนวน Tests**: 271 Tests
- **สถานะ**: ผ่านครบ 100%

สามารถรันการทดสอบได้ด้วยคำสั่ง:
```bash
npm test
```
หรือรันเฉพาะไฟล์ที่ต้องการ:
```bash
npx jest src/modules/queue/use-cases/claim-queue-item.use-case.spec.ts
```
