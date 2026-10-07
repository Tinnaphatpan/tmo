# เอกสารส่งมอบระบบ TMO Grading Queue (Project Handover Documentation)

ชุดเอกสารฉบับสมบูรณ์สำหรับส่งมอบโครงการพัฒนาระบบ **TMO Grading Queue (ระบบจัดการคิวตรวจข้อสอบและประมวลผลคะแนนการแข่งขันคณิตศาสตร์โอลิมปิกระดับชาติ)**

---

## สารบัญเอกสาร (Document Catalog)

| ลำดับ | ชื่อเอกสาร | รายละเอียดเนื้อหา | กลุ่มผู้อ่านเป้าหมาย |
|:---:|---|---|---|
| **01** | [**01. ภาพรวมระบบ (System Overview)**](./01-system-overview.md) | ที่มา วัตถุประสงค์ ขอบเขตระบบ และบทบาทผู้ใช้งานทั้ง 5 กลุ่ม (Admin, Committee, Staff, Team Leader, Public) | ทุกฝ่าย / ผู้บริหาร / กรรมการ |
| **02** | [**02. สถาปัตยกรรมระบบ (System Architecture)**](./02-system-architecture.md) | สถาปัตยกรรม Next.js 16 BFF, การควบคุมความปลอดภัยด้วย Session Cookie, Server-side Dynamic Role Guarding, SSE Realtime และระบบดีไซน์ | Developers / Architects / DevOps |
| **03** | [**03. คู่มือการใช้งานระบบ (User Manual)**](./03-user-manual.md) | คู่มือการใช้งานแบบละเอียด Step-by-Step สำหรับ Admin, Committee, Staff, Team Leader และการเปิดจอฉาย Projector | ผู้ใช้งานจริง / เจ้าหน้าที่สนามสอบ |
| **04** | [**04. โครงสร้างข้อมูลและ Entity (Data Model & Entities)**](./04-data-model-and-entities.md) | ไดอะแกรม ERD, โครงสร้าง Attributes ของ Entity (School, Student, QueueItem, Score, EditRequest, Approval, AuditLog) และค่า Enums | Database Admin / Developers |

---

## สรุปข้อมูลเทคโนโลยีและโครงสร้างระบบโดยย่อ (System Quick Reference)

- **Frontend Core**: Next.js 16 (App Router), React 19, TypeScript
- **Styling & UI**: Tailwind CSS, Calm Crimson Palette (KMUTNB Red `#C8102E` & Slate `#0F172A`)
- **Architecture Pattern**: BFF (Backend For Frontend) with `httpOnly` Session Cookie Proxying
- **Realtime Engine**: Server-Sent Events (SSE) direct from Client to `/queue/stream`
- **Testing Framework**: Vitest + React Testing Library (136 tests, 100% pass)
- **Port การทำงานมาตรฐาน**:
  - Frontend (Next.js BFF): `http://localhost:3000`
  - Backend (NestJS API): `http://localhost:4000`
