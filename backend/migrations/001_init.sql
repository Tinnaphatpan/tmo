-- 001_init.sql
-- TMO Grading Queue — initial schema (SPEC.md §2.1)
-- Assumes the target database already exists and this batch runs inside it.
-- No ORM: raw DDL, VARCHAR+CHECK in place of native enums (MSSQL has none).

-- Required for the filtered index below (IX_QueueItem_ClaimedByUserId).
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- ============================================================
-- School — ศูนย์สอบ/โรงเรียน (SPEC §2.1)
-- ============================================================
CREATE TABLE School (
    Id   UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_School_Id DEFAULT NEWID(),
    Name NVARCHAR(255)    NOT NULL,
    Code NVARCHAR(20)     NULL,
    CONSTRAINT PK_School PRIMARY KEY (Id),
    CONSTRAINT UQ_School_Name UNIQUE (Name)
);

-- ============================================================
-- [User] — บัญชีผู้ใช้ทุก role (SPEC §2.1, §2.2)
-- "User" is reserved in T-SQL, bracket-quoted throughout.
-- ============================================================
CREATE TABLE [User] (
    Id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_User_Id DEFAULT NEWID(),
    Username     NVARCHAR(50)     NOT NULL,
    DisplayName  NVARCHAR(255)    NOT NULL,
    PasswordHash NVARCHAR(255)    NOT NULL,
    Role         VARCHAR(10)      NOT NULL,
    SchoolId     UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_User PRIMARY KEY (Id),
    CONSTRAINT UQ_User_Username UNIQUE (Username),
    CONSTRAINT CK_User_Role CHECK (Role IN ('ADMIN', 'COMMITTEE', 'MENTOR')),
    -- SPEC §2.1: FK to School kept NO ACTION (consistent with QueueItem below) —
    -- app layer must check/clear before deleting a School with mentors attached.
    CONSTRAINT FK_User_School FOREIGN KEY (SchoolId) REFERENCES School (Id) ON DELETE NO ACTION
);

CREATE INDEX IX_User_SchoolId ON [User] (SchoolId);

-- ============================================================
-- CommitteeAssignment — กรรมการคนหนึ่งตรวจข้อไหน (SPEC §0.1, §2.1)
-- ============================================================
CREATE TABLE CommitteeAssignment (
    Id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_CommitteeAssignment_Id DEFAULT NEWID(),
    UserId        UNIQUEIDENTIFIER NOT NULL,
    ProblemNumber INT              NOT NULL,
    CONSTRAINT PK_CommitteeAssignment PRIMARY KEY (Id),
    CONSTRAINT UQ_CommitteeAssignment_User_Problem UNIQUE (UserId, ProblemNumber),
    CONSTRAINT FK_CommitteeAssignment_User FOREIGN KEY (UserId) REFERENCES [User] (Id) ON DELETE CASCADE
);

CREATE INDEX IX_CommitteeAssignment_UserId ON CommitteeAssignment (UserId);

-- ============================================================
-- QueueItem — 1 รายการ = 1 ศูนย์ + 1 ข้อ ที่ต้องตรวจ (SPEC §2.1, §2.6)
-- ============================================================
CREATE TABLE QueueItem (
    Id               UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_QueueItem_Id DEFAULT NEWID(),
    SchoolId         UNIQUEIDENTIFIER NOT NULL,
    ProblemNumber    INT              NOT NULL,
    Status           VARCHAR(11)      NOT NULL CONSTRAINT DF_QueueItem_Status DEFAULT 'WAITING',
    Position         INT              NOT NULL CONSTRAINT DF_QueueItem_Position DEFAULT 0,
    ScheduledAt      DATETIME2        NULL,
    ClaimedByUserId  UNIQUEIDENTIFIER NULL,
    ClaimedAt        DATETIME2        NULL,
    CompletedAt      DATETIME2        NULL,
    CONSTRAINT PK_QueueItem PRIMARY KEY (Id),
    CONSTRAINT UQ_QueueItem_School_Problem UNIQUE (SchoolId, ProblemNumber),
    CONSTRAINT CK_QueueItem_Status CHECK (Status IN ('WAITING', 'IN_PROGRESS', 'DONE')),
    -- SPEC §2.1: MSSQL rejects multiple cascade paths converging on the same table,
    -- so this FK is explicitly NO ACTION — app code must delete QueueItem rows itself
    -- before a School can be removed (mirrors the old Prisma onDelete: Restrict).
    CONSTRAINT FK_QueueItem_School FOREIGN KEY (SchoolId) REFERENCES School (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_QueueItem_ClaimedByUser FOREIGN KEY (ClaimedByUserId) REFERENCES [User] (Id) ON DELETE NO ACTION
);

CREATE INDEX IX_QueueItem_SchoolId ON QueueItem (SchoolId);
CREATE INDEX IX_QueueItem_ProblemNumber_Status ON QueueItem (ProblemNumber, Status);
-- Plain (non-filtered) index: a filtered index would require every session
-- that touches this table to run with SET QUOTED_IDENTIFIER ON, which some
-- clients/tools (e.g. default sqlcmd) don't set — not worth the footgun for
-- a table this small (16 schools × 5 problems = 80 rows).
CREATE INDEX IX_QueueItem_ClaimedByUserId ON QueueItem (ClaimedByUserId);

-- ============================================================
-- Student — นักเรียนของศูนย์ (fixed 6 คน/ศูนย์) (SPEC §2.1, §4.1)
-- Name added: required by import validation (§4.1) and export (§4.2/§4.4)
-- even though not spelled out in the schema table row.
-- ============================================================
CREATE TABLE Student (
    Id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Student_Id DEFAULT NEWID(),
    StudentCode NVARCHAR(20)     NOT NULL,
    SeqNo       INT              NOT NULL,
    Name        NVARCHAR(255)    NOT NULL,
    SchoolId    UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT PK_Student PRIMARY KEY (Id),
    CONSTRAINT UQ_Student_StudentCode UNIQUE (StudentCode),
    CONSTRAINT UQ_Student_School_SeqNo UNIQUE (SchoolId, SeqNo),
    CONSTRAINT FK_Student_School FOREIGN KEY (SchoolId) REFERENCES School (Id) ON DELETE CASCADE
);

CREATE INDEX IX_Student_SchoolId ON Student (SchoolId);

-- ============================================================
-- Score — คะแนนของนักเรียน 1 คน ต่อ 1 QueueItem (SPEC §2.1, §8.1)
-- Unique key intentionally kept as (StudentId, QueueItemId) WITHOUT JudgeId —
-- multi-judge averaging is a known limitation, confirmed out of scope for this
-- rewrite (see SPEC §8 item 1 / PROMPT.md §3). A later judge overwrites an
-- earlier one by design.
-- CreatedAt/UpdatedAt added: needed for the "เวลาบันทึก" export column (§4.2)
-- that has no other source field in the spec's table row.
-- ============================================================
CREATE TABLE Score (
    Id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Score_Id DEFAULT NEWID(),
    StudentId   UNIQUEIDENTIFIER NOT NULL,
    QueueItemId UNIQUEIDENTIFIER NOT NULL,
    Value       DECIMAL(4, 2)    NOT NULL,
    JudgeId     UNIQUEIDENTIFIER NOT NULL,
    CreatedAt   DATETIME2        NOT NULL CONSTRAINT DF_Score_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL CONSTRAINT DF_Score_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Score PRIMARY KEY (Id),
    CONSTRAINT UQ_Score_Student_QueueItem UNIQUE (StudentId, QueueItemId),
    -- DB-level guard on the 0.00-10.00 range (SPEC §6 "Data integrity ที่ระดับ DB")
    CONSTRAINT CK_Score_Value CHECK (Value BETWEEN 0.00 AND 10.00),
    CONSTRAINT FK_Score_Student FOREIGN KEY (StudentId) REFERENCES Student (Id) ON DELETE CASCADE,
    CONSTRAINT FK_Score_QueueItem FOREIGN KEY (QueueItemId) REFERENCES QueueItem (Id) ON DELETE CASCADE,
    CONSTRAINT FK_Score_Judge FOREIGN KEY (JudgeId) REFERENCES [User] (Id) ON DELETE NO ACTION
);

CREATE INDEX IX_Score_QueueItemId ON Score (QueueItemId);
CREATE INDEX IX_Score_StudentId ON Score (StudentId);
CREATE INDEX IX_Score_JudgeId ON Score (JudgeId);

-- ============================================================
-- CompetitionSettings — Singleton row (SPEC §2.1, §0.5)
-- Deliberately INT Id with CHECK(Id=1), NOT the UNIQUEIDENTIFIER convention
-- used everywhere else — SPEC explicitly calls this out as the singleton key.
-- ============================================================
CREATE TABLE CompetitionSettings (
    Id            INT       NOT NULL CONSTRAINT DF_CompetitionSettings_Id DEFAULT 1,
    ScoringLocked BIT       NOT NULL CONSTRAINT DF_CompetitionSettings_ScoringLocked DEFAULT 0,
    LockedAt      DATETIME2 NULL,
    LockedBy      UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_CompetitionSettings PRIMARY KEY (Id),
    CONSTRAINT CK_CompetitionSettings_Singleton CHECK (Id = 1),
    CONSTRAINT FK_CompetitionSettings_LockedBy FOREIGN KEY (LockedBy) REFERENCES [User] (Id) ON DELETE NO ACTION
);

-- Seed the one-and-only settings row so the app can always UPDATE instead of
-- having to branch on "does the singleton exist yet" at request time.
INSERT INTO CompetitionSettings (Id, ScoringLocked) VALUES (1, 0);

-- ============================================================
-- ScoreEditRequest — คำขอแก้คะแนนหลังล็อก (SPEC §2.1, §2.5, §2.6)
-- ============================================================
CREATE TABLE ScoreEditRequest (
    Id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ScoreEditRequest_Id DEFAULT NEWID(),
    ScoreId     UNIQUEIDENTIFIER NOT NULL,
    RequestedBy UNIQUEIDENTIFIER NOT NULL,
    OldValue    DECIMAL(4, 2)    NOT NULL,
    NewValue    DECIMAL(4, 2)    NOT NULL,
    Reason      NVARCHAR(MAX)    NOT NULL,
    Status      VARCHAR(10)      NOT NULL CONSTRAINT DF_ScoreEditRequest_Status DEFAULT 'PENDING',
    ReviewedBy  UNIQUEIDENTIFIER NULL,
    ReviewedAt  DATETIME2        NULL,
    CreatedAt   DATETIME2        NOT NULL CONSTRAINT DF_ScoreEditRequest_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ScoreEditRequest PRIMARY KEY (Id),
    CONSTRAINT CK_ScoreEditRequest_Status CHECK (Status IN ('PENDING', 'APPROVED', 'REJECTED')),
    CONSTRAINT CK_ScoreEditRequest_NewValue CHECK (NewValue BETWEEN 0.00 AND 10.00),
    CONSTRAINT FK_ScoreEditRequest_Score FOREIGN KEY (ScoreId) REFERENCES Score (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_ScoreEditRequest_RequestedBy FOREIGN KEY (RequestedBy) REFERENCES [User] (Id) ON DELETE NO ACTION,
    CONSTRAINT FK_ScoreEditRequest_ReviewedBy FOREIGN KEY (ReviewedBy) REFERENCES [User] (Id) ON DELETE NO ACTION
);

CREATE INDEX IX_ScoreEditRequest_ScoreId ON ScoreEditRequest (ScoreId);
CREATE INDEX IX_ScoreEditRequest_Status ON ScoreEditRequest (Status);

-- ============================================================
-- AuditLog — ประวัติทุกการแก้ไข (SPEC §0.7, §2.1)
-- PerformedBy added: an audit log with no actor is not an audit log — SPEC's
-- field list omits it but every write path (judge scoring, admin approving an
-- edit request) has an authenticated actor to record.
-- ============================================================
CREATE TABLE AuditLog (
    Id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_AuditLog_Id DEFAULT NEWID(),
    Action      NVARCHAR(50)     NOT NULL,
    EntityType  NVARCHAR(30)     NOT NULL,
    EntityId    NVARCHAR(100)    NOT NULL,
    OldValue    NVARCHAR(MAX)    NULL,
    NewValue    NVARCHAR(MAX)    NULL,
    PerformedBy UNIQUEIDENTIFIER NOT NULL,
    CreatedAt   DATETIME2        NOT NULL CONSTRAINT DF_AuditLog_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_AuditLog PRIMARY KEY (Id),
    CONSTRAINT FK_AuditLog_PerformedBy FOREIGN KEY (PerformedBy) REFERENCES [User] (Id) ON DELETE NO ACTION
);

CREATE INDEX IX_AuditLog_EntityType_EntityId ON AuditLog (EntityType, EntityId);
CREATE INDEX IX_AuditLog_CreatedAt ON AuditLog (CreatedAt);
