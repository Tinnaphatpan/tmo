# Prompt: สร้างระบบ TMO Grading Queue ใหม่ตาม SPEC.md

ใช้ prompt นี้สั่ง AI coding agent (Claude Code หรือเทียบเท่า) พร้อมแนบไฟล์ [SPEC.md](SPEC.md) เป็น context เดียวกัน

---

## คำสั่งสำหรับ Agent

อ่านไฟล์ `SPEC.md` ที่แนบมาให้ครบทุกหัวข้อก่อนเริ่มเขียนโค้ด เอกสารนี้คือ requirement spec ฉบับเต็มของระบบ "TMO Grading Queue" — ระบบจัดการคิวตรวจข้อสอบสำหรับการแข่งขันคณิตศาสตร์โอลิมปิก ให้สร้างระบบนี้ขึ้นใหม่ทั้งหมดด้วย tech stack และสถาปัตยกรรมตามหัวข้อ 1 ของ SPEC.md

### ขอบเขตงาน

1. **Data & Logic ต้องตรงกับ SPEC.md ทุกจุด** — schema (หัวข้อ 2.1), auth/authorization pattern (หัวข้อ 2.2), realtime (หัวข้อ 2.3), rotation algorithm (หัวข้อ 2.4), API contract ทุก endpoint (หัวข้อ 2.5), business rules (หัวข้อ 2.6), import/export format (หัวข้อ 4), non-functional requirements (หัวข้อ 6) — ห้ามเปลี่ยน behavior ทางธุรกิจจากที่ระบุไว้ แม้จะเปลี่ยน implementation ได้
2. **UI ต้องคงเดิม** — ใช้ design system ตามหัวข้อ 3 (สี, ฟอนต์, component pattern) และ screen/flow ตามหัวข้อ 5 ทุกหน้า/ทุก role อย่างครบถ้วน ไม่ต้องออกแบบใหม่ แค่ implement ให้ตรงตามที่ระบุ
3. **Known Limitations (หัวข้อ 8)** — อ่านและถามฉันก่อนว่าจะแก้ปัญหาเชิงโครงสร้างข้อไหนบ้างตั้งแต่ตอนออกแบบ schema (โดยเฉพาะข้อ 1 เรื่อง unique key ของ `Score` ที่ไม่รองรับตรวจซ้ำหลายกรรมการ) ก่อนเริ่มเขียน schema จริง อย่าตัดสินใจเองโดยไม่ถาม

### ขั้นตอนที่ต้องทำ

1. **Setup project structure** — แยก repo/โฟลเดอร์ frontend (Next.js) และ backend (NestJS, Clean Architecture: `controller → use-case → domain → repository`) ตามหัวข้อ 1.2
2. **เขียน MSSQL schema + migration** — ไฟล์ `.sql` เรียงเลขตามหัวข้อ 1.3 (Migration) และ 2.1 (schema เต็ม) พร้อมตาราง `_migrations` สำหรับ track
3. **Backend (NestJS)**:
   - Auth module: `POST /auth/login` ออก JWT ตามหัวข้อ 2.2, bcrypt compare password
   - Guard: `AuthGuard` + `RolesGuard`/`@Roles()` ที่ verify JWT แล้ว **query DB ยืนยัน role จริงทุก request** (ห้ามเชื่อ JWT claim อย่างเดียว)
   - Repository layer ใช้ `mssql` เขียน parameterized query ทั้งหมด (ห้าม string-concat SQL)
   - Transaction helper กลาง บังคับให้ `Score` write + `AuditLog` write อยู่ธุรกรรมเดียวกันเสมอ (หัวข้อ 1.4)
   - Controllers ตาม endpoint list หัวข้อ 2.5 ทุกตัว พร้อม DTO validation ด้วย `class-validator`/`class-transformer`
   - Realtime module: SSE endpoint ตามหัวข้อ 2.3 (event: `ready`/`changed`/`ping`)
   - เขียน Jest unit test ให้ Use Case ที่มีความเสี่ยงสูงตามหัวข้อ 8 ข้อ 6 (claim race condition, กรองสิทธิ์ตามข้อที่มอบหมาย, กรอกคะแนนไม่ครบห้ามปิดคิว, mentor scope, scoring lock)
4. **Frontend (Next.js)**:
   - BFF Route Handlers (`/api/bff/*`) proxy ไป NestJS พร้อมแนบ JWT จาก httpOnly cookie ตามหัวข้อ 1.2/2.2
   - Middleware role-gate ตามหัวข้อ 2.2 ย่อหน้าสุดท้าย
   - หน้าและ component ทุกตัวตามหัวข้อ 5 (public, committee, mentor, admin) ใช้ design tokens ตามหัวข้อ 3
5. **Data migration** — เขียน script แปลงข้อมูลจาก `backup/tmo_db_backup_*.sql` (PostgreSQL) เข้า MSSQL ตามแนวทางหัวข้อ 9 (เลือกแนวทางที่เหมาะสมแล้วอธิบายเหตุผล)

### กติกาในการทำงาน

- ถ้าเจอจุดที่ SPEC.md ไม่ได้ระบุไว้ชัดเจน (เช่น รายละเอียด error message ใหม่, JWT TTL, connection pool size) ให้เลือก default ที่สมเหตุสมผลแล้วบอกฉันว่าเลือกอะไรทำไม ไม่ต้องหยุดถามทุกจุดเล็ก ๆ
- ถ้าเจอจุดที่กระทบ business logic หรือ data integrity (เช่น Known Limitations หัวข้อ 8) ให้ถามก่อนเสมอ
- ทำทีละเลเยอร์ (schema → backend → frontend) แล้ว verify แต่ละขั้นก่อนไปต่อ ไม่ต้องรวบทำทีเดียวทั้งระบบ
- อ้างอิงเลขหัวข้อของ SPEC.md ในคอมเมนต์/PR description เมื่อ implement business rule ที่ซับซ้อน เพื่อให้ตรวจสอบย้อนกลับได้ง่าย
