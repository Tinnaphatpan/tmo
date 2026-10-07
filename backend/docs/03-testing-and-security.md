# 03 — Testing, Quality Assurance & Security

เอกสารฉบับนี้ระบุกลยุทธ์การทดสอบระบบ (Testing Strategy), เครื่องมือวัดคุณภาพซอฟต์แวร์ ตลอดจนมาตรฐานและมาตรการความปลอดภัยของข้อมูลในระบบ **TMO Grading Queue Backend**

---

## 1. กลยุทธ์การทดสอบระบบ (Testing Architecture)

โปรเจกต์นี้ได้รับการออกแบบตามหลัก **Clean Architecture** ซึ่งแยก Business Logic (Use Cases) ออกจาก I/O และ Database ทำให้สามารถทดสอบระบบได้อย่างรวดเร็ว แม่นยำ และครอบคลุม

```
┌─────────────────────────────────────────────────────────┐
│                       Unit Tests                        │
│   (Jest + In-Memory Fake Repositories — ไม่ต้องเปิด DB)    │
│   • 33 Test Suites / 271 Tests                          │
│   • ทดสอบ Business Logic, Validations, State Transitions│
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    Concurrency Tests                    │
│   (Node.js Stress Test Script: scripts/concurrency-test)│
│   • ยิง 50+ Concurrent Readers + SSE Stream             │
│   • จำลองการแย่ง Claim คิวพร้อมกันของกรรมการหลายคน       │
└─────────────────────────────────────────────────────────┘
```

### 1.1 In-Memory Fake Repositories
ในโฟลเดอร์ `src/testing/` มีการสร้าง Fake Repositories สำหรับทุก Entity (เช่น `FakeQueueRepository`, `FakeScoresRepository`, `FakeUsersRepository`) เพื่อให้ Use Case Tests สามารถรันได้ภายในหน่วยมิลลิวินาทีโดยไม่ต้องเชื่อมต่อกับ SQL Server จริง

### 1.2 คำสั่งสำหรับการรันการทดสอบ (Running Tests)

```bash
# รัน Unit Tests ทั้งหมด
npm test

# รัน Test พร้อมดู Code Coverage
npm run test:cov

# รัน Test เฉพาะไฟล์ที่ต้องการ
npx jest src/modules/queue/use-cases/claim-queue-item.use-case.spec.ts

# รัน Test ในโหมด Watch (สำหรับช่วงพัฒนา)
npm run test:watch
```

---

## 2. การทดสอบ Concurrency & Race Condition (Concurrency Testing)

ระบบมีสคริปต์ `scripts/concurrency-test.mjs` สำหรับจำลองสถานการณ์จริงที่มีการใช้งานพร้อมกันจำนวนมากในวันแข่งขัน

### 2.1 สิ่งที่สคริปต์ทดสอบ
1. **Queue Claim Contention**: กรรมการหลายคนส่งคำขอ `POST /queue/:id/claim` สำหรับคิวเดียวกันในเวลาเดียวกัน ผลลัพธ์ต้องมีผู้ชนะเพียง 1 คน (`200 OK`) และคนอื่นๆ ต้องได้ `409 Conflict` เท่านั้น (ห้ามเกิด Double Claim)
2. **High-Concurrency Reads**: มี Client เชื่อมต่อดึงข้อมูลภาพรวมคิว (`GET /queue`) และรับ Realtime Stream (`GET /queue/stream`) พร้อมกัน 50+ Connection
3. **End-to-End Flow Under Load**: ทดสอบ Claim → Score Submission → Team Leader Approval → PDF Generation ภายใต้โหลดพร้อมกัน

### 2.2 วิธีการรัน Concurrency Test
```bash
# 1. รัน Server ใน Terminal ที่ 1
npm run start:dev

# 2. รัน Concurrency Test ใน Terminal ที่ 2 (จะทำการทดสอบและรายงาน Latency Percentiles)
node scripts/concurrency-test.mjs --yes
```

---

## 3. มาตรการความปลอดภัยและความถูกต้องของข้อมูล (Security Standards)

### 3.1 การป้องกัน SQL Injection (100% Parameterized Queries)
ระบบ **ไม่มีการใช้ ORM** แต่ใช้คำสั่ง Raw SQL ผ่านไดรเวอร์ `mssql` (tedious) โดยบังคับใช้ Parameterized Inputs ทุกจุด 100%:

```typescript
// ตัวอย่าง: การใช้ Parameterized Query ที่ปลอดภัย
const request = new sql.Request(transaction);
request.input('id', sql.UniqueIdentifier, queueItemId);
request.input('status', sql.VarChar(20), 'DONE');
await request.query(`
  UPDATE QueueItem 
  SET Status = @status, CompletedAt = SYSUTCDATETIME() 
  WHERE Id = @id
`);
```

### 3.2 ระบบ Double-Verification Guards ป้องกัน Token Role Drift
ปัญหาคลาสสิกของ JWT คือเมื่อ Role ของ User ถูกแก้ใน Database ข้อมูลใน Token ของ Client จะยังเป็น Role เดิมจนกว่าจะหมดอายุ เพื่อแก้ปัญหานี้ ระบบออกแบบ Guard เป็น 2 ชั้น:
1. **`AuthGuard`**: ตรวจสอบความถูกต้องของ Signature และวันหมดอายุของ JWT
2. **`RolesGuard`**: ดึงข้อมูล `User` ล่าสุดจากตารางใน MSSQL เพื่อยืนยันว่าผู้ใช้ยังมีตัวตนจริง และมี Role ตรงตามที่ Route ต้องการในขณะนั้นจริง

### 3.3 การป้องกัน Insecure Direct Object Reference (IDOR Protection)
ในทุก Endpoint ของ `TEAM_LEADER` เช่น `/team-leader/approvals` หรือ `/team-leader/score-edit-requests` ระบบจะนำ `user.schoolId` ที่ได้จาก Database มาเป็นเงื่อนไขในการ Query เสมอ หัวหน้าทีมจะไม่สามารถดูหรืออนุมัติคะแนนของศูนย์สอบอื่นได้แม้จะส่ง ID ของคิวอื่นมาก็ตาม

### 3.4 การเข้ารหัสรหัสผ่าน (Password Security)
- รหัสผ่านของผู้ใช้ทุกคนถูก Hash ด้วยอัลกอริทึม **`bcrypt`** โดยกำหนดค่า Salt Rounds ขั้นต่ำที่ `10`
- API จะไม่ส่งฟิลด์ `passwordHash` กลับไปใน Response ใดๆ ของระบบ

### 3.5 ธุรกรรมแบบ Atomic พร้อมการบันทึก Audit Log (TransactionRunner)
ทุกคำสั่งที่เกี่ยวข้องกับการเปลี่ยนแปลงคะแนน (`Score`) สถานะคิว หรือการอนุมัติ จะถูกห่อหุ้มไว้ใน MSSQL Transaction ผ่าน `TransactionRunner`:

```typescript
await this.transactionRunner.run(async (tx) => {
  // 1. บันทึกคะแนน
  await this.scoresRepository.upsertWithTx(tx, scoreData);
  
  // 2. บันทึกประวัติ Audit Log
  await this.auditLogRepository.createWithTx(tx, {
    action: 'SCORE_SUBMITTED',
    entityType: 'QueueItem',
    entityId: queueItemId,
    performedBy: judgeId,
    newValue: JSON.stringify(scores),
  });
  // หากขั้นตอนใดผิดพลาด ทั้งหมดจะถูก Rollback อัตโนมัติ
});
```

---

## 4. มาตรฐานคุณภาพโค้ด (Code Quality & Linting)

- **Linter**: ใช้ `oxlint` ซึ่งมีความเร็วสูงในการตรวจสอบปัญหาทางไวยากรณ์และความปลอดภัยของโค้ด TypeScript
- **Formatter**: ใช้ `prettier` ในการควบคุมรูปแบบการจัดวางโค้ดให้เป็นมาตรฐานเดียวกัน
- **TypeScript Strict Mode**: เปิดใช้งาน strict type checking เพื่อป้องกันปัญหา runtime type errors

```bash
# ตรวจสอบ Linting
npm run lint

# จัดรูปแบบโค้ดอัตโนมัติ
npm run format
```
