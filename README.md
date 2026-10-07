# TMO Grading Queue — ระบบจัดการคิวตรวจข้อสอบคณิตศาสตร์โอลิมปิก

ระบบจัดการคิวตรวจข้อสอบสำหรับการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติ (Thailand Mathematical Olympiad - TMO) ครอบคลุมการหมุนเวียนตรวจข้อสอบ 16 ศูนย์สอบ × 5 ข้อสอบ พร้อมระบบขอแก้ไขคะแนน การอนุมัติใบคะแนน ลงนามอิเล็กทรอนิกส์ (E-Signature) และการสร้างเอกสาร PDF อัตโนมัติ

> 📖 **เอกสารฉบับเต็ม**: กรุณาอ่าน [DOCS_FULLSTACK.md](DOCS_FULLSTACK.md) สำหรับรายละเอียดทางเทคนิค สถาปัตยกรรม Database Schema, API Contracts และคู่มือฉบับสมบูรณ์

---

## สถาปัตยกรรมระบบ (System Architecture)

- **Frontend (`frontend/`)**: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS ("Calm Crimson" Design System), BFF (Backend For Frontend) Pattern
- **Backend (`backend/`)**: NestJS, Clean Architecture (`Controller` → `Use Case` → `Domain` → `Repository`), Raw Parameterized SQL via `mssql` (tedious), JWT Authentication, SSE Realtime Stream
- **Database**: Microsoft SQL Server 2019 (`TmoGradingQueue`), Atomic Transactions via `TransactionRunner`, SQL Migrations (`migrations/*.sql`)
- **Document Generation**: `pdfkit` + Noto Sans Thai Font + Pre-registered Signatures

---

## การเริ่มต้นใช้งานด่วน (Quick Start)

### 1. เปิดเซอร์วิสฐานข้อมูล SQL Server
เนื่องจากเครื่อง Windows ตั้งค่าเริ่มต้นเซอร์วิส SQL Server เป็นแบบ Manual ให้เปิดเซอร์วิสด้วยสิทธิ์ Administrator:

- **วิธีง่ายที่สุด**: ดับเบิลคลิกไฟล์ [start-database.bat](file:///c:/tmo/start-database.bat) (หรือคลิกขวาแล้วเลือก Run as administrator)
- **หรือผ่าน PowerShell (Admin)**:
  ```powershell
  Start-Service MSSQLSERVER
  ```

### 2. ตรวจสอบการเชื่อมต่อและรัน Migrations
```bash
cd backend
npm run check:db   # ตรวจสอบการเชื่อมต่อตาม backend/.env
npm run migrate    # สร้างตารางในฐานข้อมูล
npm run seed       # ใส่ข้อมูลตัวอย่าง (16 ศูนย์, บัญชีผู้ใช้, คิว)
```

### 3. รันระบบ (Development Mode)

เปิด 2 Terminal:

**Terminal 1 — Backend (API Port 4000):**
```bash
cd backend
npm run start:dev
```

**Terminal 2 — Frontend (Web UI Port 3000):**
```bash
cd frontend
npm run dev
```

เปิดเว็บเบราว์เซอร์ไปที่: `http://localhost:3000`

---

## บัญชีผู้ใช้สำหรับการทดสอบ (Default Seed Accounts)

| บัญชีผู้ใช้ (Username) | รหัสผ่าน (Password) | บทบาท (Role) | สิทธิ์ / ศูนย์สอบ |
|---|---|---|---|
| `admin` | `password123` | `ADMIN` | สิทธิ์สูงสุด ดูแลระบบและสิทธิ์ทั้งหมด |
| `committee1` | `password123` | `COMMITTEE` | กรรมการตรวจข้อสอบข้อ 1 |
| `committee2` | `password123` | `COMMITTEE` | กรรมการตรวจข้อสอบข้อ 2 |
| `staff1` | `password123` | `STAFF` | เจ้าหน้าที่ช่วยตรวจ |
| `teamleader1` | `password123` | `TEAM_LEADER` | หัวหน้าทีมประจำศูนย์สอบที่ 1 (อนุมัติใบคะแนน) |

---

## การทดสอบระบบ (Quality Assurance)

- **Backend Tests (Jest)**: 33 Test Suites, 271 Tests passed (`npm test` ใน `backend/`)
- **Frontend Tests (Vitest)**: 14 Test Files, 136 Tests passed (`npm test` ใน `frontend/`)
- **Build Verification**: ทั้ง Backend (`nest build`) และ Frontend (`next build`) คอมไพล์ผ่าน 100%
