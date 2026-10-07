# TMO Grading Queue — เอกสารส่งมอบระบบ (Project Handover Documentation)

ยินดีต้อนรับสู่ชุดเอกสารส่งมอบระบบ **TMO Grading Queue — Backend API (NestJS + MSSQL)** สำหรับการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติ (Thailand Mathematical Olympiad: TMO)

เอกสารชุดนี้จัดทำขึ้นเพื่อให้ทีมผู้ดูแลระบบ (DevOps / System Administrators) และทีมนักพัฒนาซอฟต์แวร์ สามารถทำความเข้าใจข้อกำหนดเชิงเทคนิค, วงจรการทำงานของระบบ (Business Workflows), สเปกของ API ทุก Endpoint ตลอดจนมาตรฐานความปลอดภัยและการทดสอบระบบได้อย่างครบถ้วน

---

## 📚 สารบัญเอกสาร (Documentation Index)

| ลำดับ | หัวข้อเอกสาร | รายละเอียดโดยสังเขป | ไฟล์เอกสาร |
|:---:|---|---|:---:|
| **1** | **API Reference & Specifications** | รายละเอียด API ทุก Endpoint แยกตามโมดูล, DTO Schemas, ตาราง Role-Based Access Control (RBAC) Matrix และ Error Codes | [01-api-reference.md](./01-api-reference.md) |
| **2** | **Business Workflows & State Machines** | แผนภาพวงจรชีวิตคิว (Claim / Release / Skip), กระบวนการบันทึกและอนุมัติคะแนน, การส่งคำขอแก้ไขคะแนน และการสร้าง PDF พร้อมลายเซ็นดิจิทัล | [02-business-workflows.md](./02-business-workflows.md) |
| **3** | **Testing, Quality Assurance & Security** | สถาปัตยกรรมการทดสอบ (33 Suites, 271 Tests), การทดสอบ Concurrency แย่ง Claim คิว, มาตรการความปลอดภัย และการตรวจสอบ Audit Log | [03-testing-and-security.md](./03-testing-and-security.md) |

---

## 🛠 ข้อมูลจำเพาะทางเทคนิค (System Highlights)

- **Framework**: [NestJS 11](https://nestjs.com/) (Node.js 20+ / TypeScript 5.7+)
- **Architecture**: Clean Architecture (`Controller` → `Use Case` → `Domain` → `Repository`)
- **Database Engine**: Microsoft SQL Server 2019+ (MSSQL)
- **Database Access**: No ORM — ใช้ Raw Parameterized Queries 100% ผ่านไดรเวอร์ `mssql` (tedious) เพื่อป้องกัน SQL Injection และควบคุม Transaction Lock ได้อย่างแม่นยำ
- **Realtime Updates**: Server-Sent Events (SSE) ผ่าน `/queue/stream`
- **PDF Engine**: `pdfkit` พร้อมการฝังฟอนต์ภาษาไทย TrueType (`NotoSansThai-Regular.ttf`)
- **Authentication**: JWT Token พร้อม Double Verification Guard ตรวจสอบ Role สดจาก Database ทุก Request

---

## 📋 รายการตรวจสอบความพร้อมการส่งมอบ (Handover Checklist)

- [x] **Source Code & Clean Architecture**: โค้ดถูกจัดหมวดหมู่อย่างเป็นระเบียบตามโมดูลและ Use Cases
- [x] **Database Schema & Migrations**: สคริปต์ Migration เรียงลำดับตั้งแต่ `001_init.sql` ถึง `004_score_approval.sql`
- [x] **Test Coverage**: ครอบคลุม Unit Tests 33 Suites, 271 Tests ด้วย In-Memory Fake Repositories
- [x] **Concurrency Safety**: ผ่านการทดสอบ Stress Test สำหรับการแย่ง Claim คิวพร้อมกัน
- [x] **Audit Trail**: ทุกการกระทำที่เกี่ยวกับคะแนนถูกบันทึกลง `AuditLog` แบบ Atomic Transaction
