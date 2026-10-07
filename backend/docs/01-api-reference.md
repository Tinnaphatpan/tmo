# 01 — API Reference & Specifications

เอกสารฉบับนี้ระบุข้อกำหนดของ API ทั้งหมดในระบบ **TMO Grading Queue Backend** รวมถึงระบบความปลอดภัย การยืนยันตัวตน และเมทริกซ์สิทธิ์การเข้าถึง (RBAC Matrix)

---

## 1. การยืนยันตัวตนและมาตรฐานการเชื่อมต่อ (Authentication & Headers)

- **Base URL**: `http://localhost:4000` (หรือ Domain สำหรับ Production)
- **Content-Type**: `application/json` (ยกเว้น Multipart Upload สำหรับ Import/Signature และ SSE Stream)
- **Authorization Header**: สำหรับ Endpoint ที่ต้องใช้สิทธิ์ ให้แนบ JWT Bearer Token:
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```
- **Double-Verification Mechanism**:
  - เมื่อ Client ส่ง Token ระบบจะตรวจสอบความถูกต้องผ่าน `AuthGuard`
  - ระบบจะทำการ Query ข้อมูลผู้ใช้และบทบาท (Role) ล่าสุดสดจากฐานข้อมูล MSSQL ผ่าน `RolesGuard` เสมอ เพื่อป้องกันปัญหา Role Drift เมื่อผู้ดูแลระบบมีการปรับเปลี่ยนสิทธิ์ระหว่างที่ Token ยังไม่หมดอายุ

---

## 2. เมทริกซ์สิทธิ์การเข้าถึง (Role-Based Access Control Matrix)

ระบบมี 4 บทบาทหลัก:
1. **`ADMIN`**: ผู้ดูแลระบบส่วนกลาง มีสิทธิ์สูงสุดในการควบคุมระบบ
2. **`COMMITTEE`**: กรรมการตรวจข้อสอบ ตรวจได้ทุกศูนย์สอบในข้อ (Problem Number) ที่ได้รับมอบหมาย
3. **`STAFF`**: เจ้าหน้าที่ตรวจข้อสอบ ตรวจได้ตามข้อและศูนย์สอบที่ระบุ (หรือทุกศูนย์หากไม่ได้จำกัด SchoolId)
4. **`TEAM_LEADER`**: หัวหน้าทีม/อาจารย์ประจำศูนย์สอบ มีสิทธิ์ตรวจสอบ อนุมัติใบคะแนน และดาวน์โหลด PDF ของศูนย์ตนเอง

| หมวดหมู่ Endpoint | Path | `PUBLIC` | `COMMITTEE` | `STAFF` | `TEAM_LEADER` | `ADMIN` |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Authentication** | `POST /auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ |
| | `GET /auth/me` | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Public Monitoring**| `GET /queue` | ✅ | ✅ | ✅ | ✅ | ✅ |
| | `GET /queue/stream` (SSE) | ✅ | ✅ | ✅ | ✅ | ✅ |
| | `GET /scoreboard` | ✅ | ✅ | ✅ | ✅ | ✅ |
| | `GET /schedule` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Queue Operations** | `GET /queue/mine` | ❌ | ✅ | ✅ | ❌ | ✅ |
| | `POST /queue/:id/claim` | ❌ | ✅ | ✅ | ❌ | ✅ |
| | `POST /queue/:id/release` | ❌ | ✅ | ✅ | ❌ | ✅ (Force) |
| | `POST /queue/:id/skip` | ❌ | ✅ | ✅ | ❌ | ✅ |
| | `POST /queue/:id/score` | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Score Edit Requests**| `POST /score-edit-requests` | ❌ | ✅ | ✅ | ✅ | ❌ |
| | `GET /score-edit-requests` | ❌ | ✅ (Scope) | ✅ (Scope) | ✅ (School) | ❌ |
| | `PATCH /score-edit-requests/:id` | ❌ | ✅ (Judge) | ✅ (Judge) | ❌ | ❌ |
| **Team Leader** | `GET /team-leader/approvals` | ❌ | ❌ | ❌ | ✅ | ❌ |
| | `POST /team-leader/approvals/:id/approve` | ❌ | ❌ | ❌ | ✅ | ❌ |
| | `GET /team-leader/approvals/:id/document` | ❌ | ❌ | ❌ | ✅ | ❌ |
| | `GET /team-leader/score-edit-requests` | ❌ | ❌ | ❌ | ✅ | ❌ |
| | `PATCH /team-leader/score-edit-requests/:id` | ❌ | ❌ | ❌ | ✅ | ❌ |
| | `GET /team-leader/report` | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Admin Operations** | `GET /admin/permissions` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `CRUD /admin/committee` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `CRUD /admin/staff` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `CRUD /admin/team-leaders` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `PATCH /admin/users/:id/role` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `POST /admin/users/:id/signature` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `POST /admin/queue/generate` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `POST /admin/queue/reset` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `CRUD /admin/schools` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `GET/DELETE /admin/students` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `POST /admin/students/import` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `PATCH /admin/settings/lock` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `GET/PATCH /admin/scores` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `GET /admin/scores/export` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `GET /admin/audit-log` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `GET/POST /admin/approvals` | ❌ | ❌ | ❌ | ❌ | ✅ |
| | `GET /admin/dashboard` | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. รายละเอียด Endpoint รายโมดูล (Detailed Endpoints)

### 3.1 Authentication (`/auth`)

#### `POST /auth/login`
เข้าสู่ระบบเพื่อขอรับ JWT Bearer Token

- **Auth Required**: ไม่มี (Public)
- **Request Body**:
  ```json
  {
    "username": "committee1",
    "password": "password123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": "usr-01",
      "username": "committee1",
      "displayName": "กรรมการประจำข้อ 1",
      "role": "COMMITTEE",
      "schoolId": null
    }
  }
  ```

#### `GET /auth/me`
ตรวจสอบข้อมูลบัญชีผู้ใช้และบทบาทปัจจุบันจากฐานข้อมูล

- **Auth Required**: `Bearer Token`
- **Response `200 OK`**: ข้อมูลโปรไฟล์ผู้ใช้และสิทธิ์ปัจจุบัน

---

### 3.2 Public Queue & Monitoring (`/queue`)

#### `GET /queue`
ดึงภาพรวมรายการคิวทั้งหมดสำหรับการแสดงผลบนหน้าจอสาธารณะ

- **Auth Required**: ไม่มี (Public)
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": "q-101",
        "schoolId": "sch-01",
        "schoolName": "โรงเรียนเตรียมอุดมศึกษา",
        "schoolCode": "TU",
        "problemNumber": 1,
        "status": "WAITING",
        "position": 1,
        "scheduledAt": "2026-10-04T09:00:00.000Z",
        "claimedByUserId": null,
        "approvalStatus": "NOT_SUBMITTED"
      }
    ],
    "problems": [1, 2, 3, 4, 5],
    "scoringLocked": false
  }
  ```

#### `GET /queue/stream`
เชื่อมต่อรับการแจ้งเตือน Realtime ผ่าน Server-Sent Events (SSE)

- **Event Types**:
  - `ready`: ส่ง Timestamp ยืนยันการเชื่อมต่อสำเร็จ
  - `changed`: แจ้งเตือนว่ามีคิวหรือคะแนนเปลี่ยนแปลง (ให้ Client Re-fetch ข้อมูล)
  - `ping`: Keep-alive packet ทุกๆ 25 วินาที

---

### 3.3 การตรวจข้อสอบ (`/queue` สำหรับ `COMMITTEE`, `STAFF`, `ADMIN`)

#### `GET /queue/mine`
ดึงรายการคิวที่ผู้ใช้มีสิทธิ์ตรวจตามวิชา/ศูนย์สอบที่ได้รับมอบหมาย

- **Auth Required**: `COMMITTEE`, `STAFF`, `ADMIN`
- **Response `200 OK`**:
  ```json
  {
    "active": {
      "id": "q-101",
      "schoolId": "sch-01",
      "schoolName": "ศูนย์ มช.",
      "problemNumber": 1,
      "status": "IN_PROGRESS",
      "students": [
        { "id": "stu-01", "studentCode": "TU01", "seqNo": 1, "name": "นายสมชาย", "score": null }
      ]
    },
    "waiting": [ ... ]
  }
  ```

#### `POST /queue/:id/claim`
ดึงคิวมาเริ่มตรวจ (เปลี่ยนสถานะเป็น `IN_PROGRESS` ด้วย Atomic SQL)

- **Auth Required**: `COMMITTEE`, `STAFF`, `ADMIN`
- **Response `200 OK`**: `{ "ok": true }`
- **Error Codes**:
  - `409 Conflict`: คิวนี้ถูกผู้อื่น Claim ไปแล้ว หรือผู้ใช้มีคิวอื่นค้างอยู่
  - `403 Forbidden`: ไม่มีสิทธิ์ตรวจข้อหรือศูนย์นี้ / ระบบล็อกคะแนนอยู่

#### `POST /queue/:id/score`
บันทึกคะแนนนักเรียนครบ 6 คน และส่งเข้าสู่สถานะ `DONE` / `PENDING` Approval

- **Auth Required**: `COMMITTEE`, `STAFF`, `ADMIN`
- **Request Body**:
  ```json
  {
    "scores": [
      { "studentId": "stu-01", "value": 8.5 },
      { "studentId": "stu-02", "value": 10.0 },
      { "studentId": "stu-03", "value": 7.0 },
      { "studentId": "stu-04", "value": 9.5 },
      { "studentId": "stu-05", "value": 6.0 },
      { "studentId": "stu-06", "value": 8.0 }
    ]
  }
  ```
- **Response `200 OK`**: `{ "ok": true }`
- **Validation**: คะแนนต้องอยู่ระหว่าง `0.00` ถึง `10.00` และต้องครบทั้ง 6 คน

#### `POST /queue/:id/skip`
ข้ามคิว (สละสิทธิ์และย้ายคิวไปต่อท้ายสุดของข้อสอบนั้น)

- **Auth Required**: `COMMITTEE`, `STAFF`, `ADMIN`
- **Response `200 OK`**: `{ "ok": true }`

#### `POST /queue/:id/release`
สละสิทธิ์คิวที่กำลังตรวจกลับคืนสู่สถานะ `WAITING`

- **Auth Required**: `COMMITTEE`, `STAFF`, `ADMIN`
- **Response `200 OK`**: `{ "ok": true }`

---

### 3.4 การจัดการคำขอแก้ไขคะแนน (`/score-edit-requests`)

#### `POST /score-edit-requests`
ส่งคำขอขอแก้คะแนน (กรรมการส่งหา Team Leader หรือ Team Leader ส่งหากรรมการ)

- **Request Body**:
  ```json
  {
    "scoreId": "sc-001",
    "newValue": 9.0,
    "reason": "รวมคะแนนในข้อย่อยที่ 2 ตกหล่น"
  }
  ```
- **Response `201 Created`**: `{ "id": "req-01" }`

#### `PATCH /score-edit-requests/:id`
กรรมการพิจารณาคำขอที่ Team Leader ส่งเข้ามา

- **Request Body**:
  ```json
  {
    "action": "APPROVE" // หรือ "REJECT"
  }
  ```

---

### 3.5 โมดูลหัวหน้าทีม (`/team-leader`)

#### `GET /team-leader/approvals`
ดึงรายการใบคะแนนที่รอการอนุมัติเฉพาะของศูนย์สอบตนเอง

#### `POST /team-leader/approvals/:id/approve`
ยืนยันอนุมัติคะแนน ประทับรูปลายเซ็นอิเล็กทรอนิกส์ และสร้างเอกสาร PDF ใบคะแนน

- **Auth Required**: `TEAM_LEADER`
- **Response `200 OK`**: `{ "ok": true, "documentPath": "storage/pdfs/..." }`

#### `GET /team-leader/approvals/:id/document`
ดาวน์โหลดไฟล์ PDF ใบคะแนนที่ได้รับการลงนามแล้ว

- **Response Header**: `Content-Type: application/pdf`

---

### 3.6 โมดูลผู้ดูแลระบบ (`/admin`)

#### `POST /admin/queue/generate`
สร้างตารางคิวหมุนเวียน 16 ศูนย์สอบ × 5 ข้อสอบ อัตโนมัติ (ช่องละ 15 นาที)

- **Request Body**:
  ```json
  {
    "date": "2026-10-05",
    "startTime": "09:00",
    "slotMinutes": 15
  }
  ```

#### `POST /admin/students/import`
นำเข้าข้อมูลนักเรียนผ่านไฟล์ CSV / Excel (`multipart/form-data`)

- **Parameters**: `file` (File), `mode`: `"preview"` หรือ `"commit"`

#### `PATCH /admin/settings/lock`
ล็อกหรือปลดล็อกระบบการบันทึกคะแนนทั้งระบบ

- **Request Body**: `{ "locked": true }`

#### `GET /admin/audit-log`
ดึงประวัติการทำงานและธุรกรรมทั้งหมดในระบบ

- **Query Parameters**: `limit`, `offset`, `action`, `q` (ค้นหา)

---

## 4. รหัสสถานะ HTTP (HTTP Status Codes)

| รหัส | ความหมาย | กรณีการใช้งาน |
|:---:|---|---|
| `200` | OK | ดำเนินการสำเร็จ |
| `201` | Created | สร้าง Entity สำเร็จ |
| `400` | Bad Request | DTO Validation ไม่ผ่าน เช่น คะแนนไม่อยู่ใน 0-10 |
| `401` | Unauthorized | ไม่ได้แนบ Token หรือ Token หมดอายุ |
| `403` | Forbidden | ไม่มีสิทธิ์ใน Role นั้น หรือเข้าถึงข้อมูลข้ามศูนย์ (IDOR Guard) |
| `404` | Not Found | ไม่พบข้อมูลที่ระบุ |
| `409` | Conflict | เกิด Race condition เช่น มีคนแย่ง Claim คิวไปก่อนแล้ว |
