# TMO Grading Queue — Frontend (Next.js 16, App Router)

เว็บแอปพลิเคชันส่วนหน้าของระบบ **TMO Grading Queue** พัฒนาด้วย **Next.js 16 (App Router)**, **React 19**, **TypeScript** และ **Tailwind CSS** ภายใต้รูปแบบสถาปัตยกรรม **BFF (Backend For Frontend)**

---

## สารบัญ

- [1. สถาปัตยกรรมระบบ (Architecture)](#1-สถาปัตยกรรมระบบ-architecture)
- [2. โครงสร้างโฟลเดอร์และหน้าจอ (Directory Structure & Routing)](#2-โครงสร้างโฟลเดอร์และหน้าจอ-directory-structure--routing)
- [3. ระบบความปลอดภัยและ Role Guarding (Security & Guards)](#3-ระบบความปลอดภัยและ-role-guarding-security--guards)
- [4. ระบบ BFF Route Handlers (Backend For Frontend)](#4-ระบบ-bff-route-handlers-backend-for-frontend)
- [5. ดีไซน์ซิสเต็มและ UI Components (Design System & UI)](#5-ดีไซน์ซิสเต็มและ-ui-components-design-system--ui)
- [6. การตั้งค่าสภาพแวดล้อม (Environment Variables)](#6-การตั้งค่าสภาพแวดล้อม-environment-variables)
- [7. การติดตั้งและเริ่มต้นใช้งาน (Installation & Setup)](#7-การติดตั้งและเริ่มต้นใช้งาน-installation--setup)
- [8. คำสั่งทั้งหมดในระบบ (Available Scripts)](#8-คำสั่งทั้งหมดในระบบ-available-scripts)
- [9. การทดสอบ (Testing)](#9-การทดสอบ-testing)
- [10. ข้อควรระวังในการ Build (Build Gotchas)](#10-ข้อควรระวังในการ-build-build-gotchas)

---

## 1. สถาปัตยกรรมระบบ (Architecture)

Frontend ออกแบบตามแนวคิด **BFF Pattern**:
1. **ไม่มีการเชื่อมต่อฐานข้อมูลโดยตรง**: Frontend ไม่มีการติดต่อกับ MSSQL และไม่ถือ Business Logic ทางธุรกิจใดๆ
2. **Session Ownership**: Frontend ทำหน้าที่เก็บรักษา JWT Token ไว้ใน `httpOnly` Cookie ที่ปลอดภัย (ชื่อ `tmo_session`)
3. **API Proxying**: การเรียก API ทั้งหมดจะส่งผ่าน Next.js Route Handlers (`/api/bff/*`) ซึ่งจะทำการแนบ Header `Authorization: Bearer <token>` ไปยัง NestJS API ที่ Port 4000
4. **Direct SSE for Realtime**: สำหรับการอัปเดตกระดานคิวแบบ Realtime ฝั่ง Client จะต่อตรงไปยัง NestJS `/queue/stream` ผ่าน Hook `useQueueStream` (เนื่องจากเป็นข้อมูลสาธารณะ ไม่ต้องผ่าน Cookie Proxy)

```
[ Browser Client ]
        │
        ├── (1) Page Requests ──────────→ [ src/proxy.ts (Auth Gate) ]
        │                                         ↓
        │                                 [ Role Layouts (requireRole) ]
        │                                         ↓
        │                                 [ React Server / Client Components ]
        │
        ├── (2) API Calls (/api/bff/*) ──→ [ Next.js BFF Catch-All Proxy ]
        │                                         ↓ (Attach Bearer JWT)
        │                                 [ NestJS API Port 4000 ]
        │
        └── (3) Realtime Events ────────→ [ NestJS SSE /queue/stream (Direct) ]
```

---

## 2. โครงสร้างโฟลเดอร์และหน้าจอ (Directory Structure & Routing)

```
frontend/
├── public/                    # ไฟล์ Static เช่น ไอคอน และภาพตัวอย่าง
├── src/
│   ├── app/
│   │   ├── (public)/          # หน้าจอสาธารณะ (ไม่ต้องเข้าสู่ระบบ)
│   │   │   ├── login/         # หน้าเข้าสู่ระบบ (พร้อมลิงก์ไปยังกระดานคิว)
│   │   │   ├── queue/         # กระดานตารางคิวหมุนเวียน 16 ศูนย์ x 5 ข้อ
│   │   │   └── display/       # หน้าจอสำหรับฉาย Projector แสดงสถานะคิว
│   │   ├── committee/         # กรรมการตรวจข้อสอบ (COMMITTEE)
│   │   │   ├── page.tsx       # เรียกคิวถัดไป (Call Next), กรอกคะแนน (ScoreForm)
│   │   │   ├── scoreboard/    # สรุปคะแนนรวมทุกศูนย์
│   │   │   └── score-edit-requests/ # ส่งคำขอแก้ไขคะแนน
│   │   ├── staff/             # เจ้าหน้าที่ช่วยตรวจ (STAFF)
│   │   │   ├── page.tsx       # คิวตรวจ, ข้ามคิว (Skip), คืนคิว (Release), บันทึกคะแนน
│   │   │   ├── scoreboard/    # ดูตารางคะแนนรวม
│   │   │   └── score-edit-requests/ # ขอดูและส่งคำขอแก้ไขคะแนน
│   │   ├── team-leader/       # หัวหน้าทีมประจำศูนย์สอบ (TEAM_LEADER)
│   │   │   ├── page.tsx       # หน้าแรกและสรุปสถานะการตรวจของศูนย์ตนเอง
│   │   │   ├── approvals/     # ตรวจสอบและกดอนุมัติคะแนน (ปั๊มลายเซ็น & ดาวน์โหลด PDF)
│   │   │   ├── score-edit-requests/ # พิจารณาคำขอแก้ไขคะแนน (อนุมัติ/ปฏิเสธ)
│   │   │   └── print/         # หน้ารวมเอกสารสำหรับพิมพ์
│   │   ├── admin/             # ผู้ดูแลระบบ (ADMIN)
│   │   │   ├── page.tsx       # แผงควบคุมระบบ (Dashboard)
│   │   │   ├── queue/         # จัดการคิว, สร้างตารางอัตโนมัติ, รีเซ็ตคิว
│   │   │   ├── committee/     # จัดการผู้ใช้และสิทธิ์ (Committee, Staff, Team Leader)
│   │   │   ├── schools/       # จัดการข้อมูลศูนย์สอบ/โรงเรียน
│   │   │   ├── students/      # ข้อมูลนักเรียนและการนำเข้าไฟล์
│   │   │   ├── scores/        # ตรวจสอบคะแนนทั้งหมด
│   │   │   ├── approvals/     # ติดตามสถานะการอนุมัติและเอกสาร PDF
│   │   │   └── audit-log/     # ตรวจสอบประวัติการใช้งาน
│   │   ├── api/bff/           # Route Handlers สำหรับ BFF
│   │   │   ├── auth/login/    # POST: รับ JWT และเขียน httpOnly Cookie
│   │   │   ├── auth/logout/   # POST: ล้าง Cookie และออกจากระบบ
│   │   │   └── [...path]/     # Catch-all Proxy ส่งต่อ Request ไปยัง NestJS
│   │   ├── globals.css        # Design tokens, CSS variables, Scrollbar tokens
│   │   └── layout.tsx         # Root Layout
│   ├── components/            # Reusable UI Components
│   │   ├── layout/            # AppSidebar, Header, Navigation
│   │   ├── ui/                # Button, Modal, StatusBadge, Skeleton
│   │   ├── ConfirmModal.tsx   # Modal ยืนยันการทำรายการ (รองรับ requireText="RESET")
│   │   ├── ScoreForm.tsx      # ฟอร์มกรอกคะแนนนักเรียน 6 คน พร้อมปุ่ม "บันทึกร่าง"
│   │   ├── QueueBoardTable.tsx# ตารางคิวแบบ Grid แบ่งตามช่วงเวลา 15 นาที
│   │   └── Watermark.tsx      # ลายน้ำโปร่งแสงรักษาความปลอดภัย
│   ├── lib/                   # Utilities & Helpers
│   │   ├── api-client.ts      # Client เรียก API ผ่าน /api/bff
│   │   ├── session.ts         # การอ่าน Cookie และการทำ requireRole()
│   │   └── use-queue-stream.ts# Hook เชื่อมต่อ Realtime SSE Stream
│   └── proxy.ts               # Next.js 16 Middleware (ตรวจจับ Session Cookie)
├── .env                       # Environment Configuration
├── package.json
└── vitest.config.mts          # การตั้งค่า Vitest Testing
```

---

## 3. ระบบความปลอดภัยและ Role Guarding (Security & Guards)

### 3.1 Next.js 16 Middleware (`src/proxy.ts`)
- ตรวจสอบความมีอยู่ของ Session Cookie (`tmo_session`) สำหรับทุก Route ที่ไม่ใช่หน้า Public
- **ไม่ตรวจสอบ Role ในชั้น Proxy**: เพื่อป้องกันปัญหา Redirect Loop เมื่อ Admin เปลี่ยน Role ของผู้ใช้ในขณะที่ Cookie เดิมยังไม่หมดอายุ

### 3.2 Dynamic Role Verification (`requireRole()` ใน `src/lib/session.ts`)
- ทุก Role Layout (`admin/layout.tsx`, `committee/layout.tsx`, `staff/layout.tsx`, `team-leader/layout.tsx`) จะเรียกใช้งาน `await requireRole(['ROLE_NAME'])`
- ฟังก์ชันนี้จะส่งคำขอไปถาม NestJS ที่ `GET /auth/me` เสมอ เพื่อยืนยันว่าผู้ใช้ยังมีสิทธิ์นั้นอยู่ในฐานข้อมูลจริง ณ วินาทีนั้น
- หากสิทธิ์ไม่ถูกต้อง จะถูก Redirect ไปยังหน้าที่สอดคล้องกับ Role ใหม่ทันที

### 3.3 ลายน้ำป้องกันการรั่วไหล (Watermark Overlay)
- คอมโพเนนต์ `Watermark.tsx` ถูกฝังอยู่ใน Layout ของกรรมการ, เจ้าหน้าที่ และหัวหน้าทีม
- แสดงผลเป็น SVG Tiled Pattern โปร่งแสง ระบุ: `ชื่อผู้ใช้ · สิทธิ์ · วันที่เวลา Server`
- ถูกกำหนดให้ซ่อนอัตโนมัติเมื่อสั่งพิมพ์เอกสาร (`@media print`)

---

## 4. ระบบ BFF Route Handlers (Backend For Frontend)

1. **`POST /api/bff/auth/login`**:
   - รับ Username และ Password ส่งไปตรวจกับ Backend
   - เมื่อได้ JWT สำเร็จ จะสร้าง `httpOnly` Cookie ที่มีอายุ 12 ชั่วโมง (`SESSION_COOKIE_MAX_AGE_SECONDS=43200`)
2. **`POST /api/bff/auth/logout`**:
   - ลบ `httpOnly` Cookie ออกจากเบราว์เซอร์
3. **`ALL /api/bff/[...path]` (Catch-all Proxy)**:
   - สกัด JWT จาก Cookie แล้วนำไปใส่ใน Header `Authorization: Bearer <token>`
   - รองรับทุก HTTP Method (`GET`, `POST`, `PATCH`, `DELETE`)
   - รองรับการสตรีมไฟล์ดาวน์โหลด (CSV, Excel, PDF) และการอัปโหลดไฟล์ (Multipart Form Data) โดยตรง

---

## 5. ดีไซน์ซิสเต็มและ UI Components (Design System & UI)

### 5.1 โทนสี Calm Crimson
- **สีประจำสถาบัน**: KMUTNB Red (`#C8102E`) และ Slate (`#0F172A`)
- **กระดานคิวสาธารณะ (`/queue`)**: โทนสีครีม-ลาเวนเดอร์ สบายตา มองเห็นชัดเจนบนจอแสดงผลรวม
- **การจัดการ Scroll Jank**:
  - ใช้ `overflow-x: clip` บน Body เพื่อป้องกันไม่ให้กระทบ `position: sticky` ของ Sidebar
  - กำหนด `scrollbar-gutter: stable` ป้องกัน Layout ขยับเมื่อมี Scrollbar

### 5.2 ส่วนประกอบ UI สำคัญ
- **`AppSidebar.tsx`**: แถบนำทางด้านข้างแบบ Sticky บนจอ Desktop และเปลี่ยนเป็น Responsive Drawer บนหน้าจอขนาดเล็ก
- **`ScoreForm.tsx`**:
  - กรอกคะแนนนักเรียน 6 คน ตรวจสอบให้อยู่ระหว่าง `0.00` ถึง `10.00`
  - มีฟีเจอร์ **"บันทึกร่าง" (Save Draft)** ลงใน `sessionStorage` ป้องกันข้อมูลสูญหายหากเผลอปิดแท็บ
- **`ConfirmModal.tsx`**: Modal ยืนยันการทำรายการที่ออกแบบตามธีม ใช้แทน `window.confirm()` แบบดั้งเดิมทั้งหมด พร้อมฟังก์ชันบังคับพิมพ์คำว่า `"RESET"` ใน Danger Zone

---

## 6. การตั้งค่าสภาพแวดล้อม (Environment Variables)

กำหนดค่าในไฟล์ `.env` ที่โฟลเดอร์ `frontend/`:

```env
# URL ฝั่ง Server-side ที่ BFF proxy เรียกไปยัง NestJS
BACKEND_URL=http://localhost:4000

# URL ฝั่ง Client-side สำหรับต่อ Realtime SSE Stream ตรง
NEXT_PUBLIC_API_URL=http://localhost:4000

# อายุของ Session Cookie ในหน่วยวินาที (12 ชม. = 43200 วินาที)
SESSION_COOKIE_MAX_AGE_SECONDS=43200
```

---

## 7. การติดตั้งและเริ่มต้นใช้งาน (Installation & Setup)

### 7.1 การติดตั้ง Dependencies
```bash
cd frontend
npm install
```

### 7.2 การรันในโหมด Development
```bash
npm run dev
# เข้าใช้งานผ่านเว็บเบราว์เซอร์ที่ http://localhost:3000
```
*(หมายเหตุ: ต้องรัน Backend API ที่ Port 4000 ควบคู่กัน)*

---

## 8. คำสั่งทั้งหมดในระบบ (Available Scripts)

| คำสั่ง | คำอธิบาย |
|---|---|
| `npm run dev` | เริ่มรัน Next.js ในโหมด Development (Port 3000) |
| `npm run build` | Build โปรเจกต์สำหรับการใช้งานจริงใน Production |
| `npm run start` | รันเซิร์ฟเวอร์ Production ที่ Build เสร็จแล้ว |
| `npm test` | รันการทดสอบ Unit & Component Tests ทั้งหมดด้วย Vitest |
| `npm run lint` | ตรวจสอบ Linting ด้วย ESLint |

---

## 9. การทดสอบ (Testing)

Frontend ใช้ **Vitest** ร่วมกับ **React Testing Library** และ **JSDOM** ในการทดสอบ:
- มีการ Mock API Client และ SSE Hook เพื่อให้ทดสอบได้โดยไม่ต้องเปิด Backend
- **จำนวน Test Files**: 14 Files
- **จำนวน Tests**: 136 Tests
- **สถานะ**: ผ่านครบ 100%

คำสั่งรันการทดสอบ:
```bash
# รันการทดสอบทั้งหมด
npm test

# รันเฉพาะไฟล์ที่ต้องการ
npx vitest run src/components/ScoreForm.test.tsx
```

---

## 10. ข้อควรระวังในการ Build (Build Gotchas)

> [!WARNING]
> หากมีการเปิด Terminal ร่วมกันระหว่าง Backend และ Frontend แล้วมีการโหลด Environment ของ Backend (`NODE_ENV=development`) ค้างไว้ในเซสชัน จะทำให้คำสั่ง `next build` เกิด Error `_global-error useContext`
> 
> **วิธีแก้**: ให้สั่งล้างค่า `NODE_ENV` ก่อนทำการ Build เสมอ:
> - **บน PowerShell**:
>   ```powershell
>   $env:NODE_ENV=""
>   npm run build
>   ```
> - **บน Bash / Linux / macOS**:
>   ```bash
>   unset NODE_ENV && npm run build
>   ```
