-- 005_normalize_3nf.sql
-- Brings the schema in line with 1NF / 2NF / 3NF:
--   1. UserAssignment: uniqueness must also hold when SchoolId is NULL.
--      SQL Server's UNIQUE treats NULLs as distinct, so (user, problem, NULL)
--      could be inserted twice. A persisted computed column maps NULL to a
--      sentinel GUID, which makes the constraint enforceable at DB level.
--   2. ScoreEditRequest.OldValue is a copy of Score.Value (transitive
--      dependency through ScoreId). Remove it; the value now lives in the
--      SCORE_EDIT_REQUESTED audit entry it was recorded with.
--   3. AuditLog.OldValue / NewValue held JSON objects and arrays (not atomic,
--      1NF). Each changed field becomes its own AuditLogChange row.
--
-- GO separators: a batch cannot reference a column or constraint created
-- earlier in the same batch.

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================================
-- 1. UserAssignment: NULL-safe uniqueness
-- ============================================================
ALTER TABLE UserAssignment DROP CONSTRAINT UQ_UserAssignment_User_Problem_School;
GO

ALTER TABLE UserAssignment ADD SchoolScopeKey AS
    ISNULL(SchoolId, CAST('00000000-0000-0000-0000-000000000000' AS UNIQUEIDENTIFIER)) PERSISTED NOT NULL;
GO

ALTER TABLE UserAssignment ADD CONSTRAINT UQ_UserAssignment_User_Problem_Scope
    UNIQUE (UserId, ProblemNumber, SchoolScopeKey);
GO

-- ============================================================
-- 2a. ScoreEditRequest: historical old value moves into the audit trail.
--     Every request gets a SCORE_EDIT_REQUESTED audit row, so requests that
--     were rejected or are still pending keep their old value too.
-- ============================================================
INSERT INTO AuditLog (Id, Action, EntityType, EntityId, PerformedBy, CreatedAt)
SELECT NEWID(), 'SCORE_EDIT_REQUESTED', 'ScoreEditRequest', CAST(r.Id AS NVARCHAR(100)),
       r.RequestedBy, r.CreatedAt
FROM ScoreEditRequest r;
GO

-- ============================================================
-- 3a. AuditLogChange: one atomic value per changed field
-- ============================================================
CREATE TABLE AuditLogChange (
    Id         UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_AuditLogChange_Id DEFAULT NEWID(),
    AuditLogId UNIQUEIDENTIFIER NOT NULL,
    FieldName  NVARCHAR(50)     NOT NULL,
    OldValue   NVARCHAR(MAX)    NULL,
    NewValue   NVARCHAR(MAX)    NULL,
    CONSTRAINT PK_AuditLogChange PRIMARY KEY (Id),
    -- Audit rows are append-only; removing one removes its changes with it.
    CONSTRAINT FK_AuditLogChange_AuditLog FOREIGN KEY (AuditLogId)
        REFERENCES AuditLog (Id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_AuditLogChange_AuditLogId ON AuditLogChange (AuditLogId);
GO

-- Edit-request rows: the old value is the copied OldValue, the new is NewValue.
INSERT INTO AuditLogChange (AuditLogId, FieldName, OldValue, NewValue)
SELECT a.Id, 'value', CAST(r.OldValue AS NVARCHAR(MAX)), CAST(r.NewValue AS NVARCHAR(MAX))
FROM AuditLog a
JOIN ScoreEditRequest r ON a.EntityType = 'ScoreEditRequest'
                       AND a.EntityId = CAST(r.Id AS NVARCHAR(100))
                       AND a.Action = 'SCORE_EDIT_REQUESTED';
GO

-- Plain-text values (e.g. Score updates): one 'value' change per row.
INSERT INTO AuditLogChange (AuditLogId, FieldName, OldValue, NewValue)
SELECT Id, 'value', OldValue, NewValue
FROM AuditLog
WHERE (OldValue IS NULL OR ISJSON(OldValue) = 0)
  AND (NewValue IS NULL OR ISJSON(NewValue) = 0)
  AND (OldValue IS NOT NULL OR NewValue IS NOT NULL)
  AND Action <> 'SCORE_EDIT_REQUESTED';
GO

-- JSON object values: one change per top-level key, paired old/new.
-- The 'assignments' array is handled separately below.
-- Same approach as the assignments below: materialise each side with short
-- (NVARCHAR(4000)) columns and use EXISTS. A hash join over NVARCHAR(MAX)
-- asked for a memory grant large enough to stall the batch.
SELECT a.Id AS AuditLogId, CAST(j.[key] AS NVARCHAR(50)) AS FieldName,
       CAST(j.value AS NVARCHAR(4000)) AS Value
INTO #ObjectBefore
FROM AuditLog a
CROSS APPLY OPENJSON(a.OldValue) j
WHERE ISJSON(a.OldValue) = 1 AND j.[key] <> 'assignments';
GO

SELECT a.Id AS AuditLogId, CAST(j.[key] AS NVARCHAR(50)) AS FieldName,
       CAST(j.value AS NVARCHAR(4000)) AS Value
INTO #ObjectAfter
FROM AuditLog a
CROSS APPLY OPENJSON(a.NewValue) j
WHERE ISJSON(a.NewValue) = 1 AND j.[key] <> 'assignments';
GO

INSERT INTO AuditLogChange (AuditLogId, FieldName, OldValue, NewValue)
SELECT k.AuditLogId, k.FieldName,
       (SELECT TOP 1 b.Value FROM #ObjectBefore b
        WHERE b.AuditLogId = k.AuditLogId AND b.FieldName = k.FieldName),
       (SELECT TOP 1 n.Value FROM #ObjectAfter n
        WHERE n.AuditLogId = k.AuditLogId AND n.FieldName = k.FieldName)
FROM (
    SELECT AuditLogId, FieldName FROM #ObjectBefore
    UNION
    SELECT AuditLogId, FieldName FROM #ObjectAfter
) k
WHERE EXISTS (SELECT 1 FROM #ObjectBefore b WHERE b.AuditLogId = k.AuditLogId AND b.FieldName = k.FieldName AND b.Value IS NOT NULL)
   OR EXISTS (SELECT 1 FROM #ObjectAfter n WHERE n.AuditLogId = k.AuditLogId AND n.FieldName = k.FieldName AND n.Value IS NOT NULL);
GO

DROP TABLE #ObjectBefore;
DROP TABLE #ObjectAfter;
GO

-- Role snapshots: the assignments array becomes one 'assignment' change per
-- entry, written as "problem:school" ('*' = all schools). An entry present
-- only before has OldValue set; only after has NewValue set; in both, both.
-- Materialise each side once: a FULL JOIN on expressions over OPENJSON made
-- the optimiser request a very large memory grant, which stalled the batch.
SELECT a.Id AS AuditLogId,
       CONCAT(JSON_VALUE(j.value, '$.problemNumber'), ':', ISNULL(JSON_VALUE(j.value, '$.schoolId'), '*')) AS EntryKey
INTO #AssignmentsBefore
FROM AuditLog a
CROSS APPLY OPENJSON(a.OldValue, '$.assignments') j
WHERE ISJSON(a.OldValue) = 1;
GO

SELECT a.Id AS AuditLogId,
       CONCAT(JSON_VALUE(j.value, '$.problemNumber'), ':', ISNULL(JSON_VALUE(j.value, '$.schoolId'), '*')) AS EntryKey
INTO #AssignmentsAfter
FROM AuditLog a
CROSS APPLY OPENJSON(a.NewValue, '$.assignments') j
WHERE ISJSON(a.NewValue) = 1;
GO

-- One row per (audit row, entry) seen on either side; each side is filled
-- only if the entry is present there.
INSERT INTO AuditLogChange (AuditLogId, FieldName, OldValue, NewValue)
SELECT k.AuditLogId, 'assignment',
       CASE WHEN EXISTS (SELECT 1 FROM #AssignmentsBefore b
                         WHERE b.AuditLogId = k.AuditLogId AND b.EntryKey = k.EntryKey)
            THEN k.EntryKey END,
       CASE WHEN EXISTS (SELECT 1 FROM #AssignmentsAfter n
                         WHERE n.AuditLogId = k.AuditLogId AND n.EntryKey = k.EntryKey)
            THEN k.EntryKey END
FROM (
    SELECT AuditLogId, EntryKey FROM #AssignmentsBefore
    UNION
    SELECT AuditLogId, EntryKey FROM #AssignmentsAfter
) k;
GO

DROP TABLE #AssignmentsBefore;
DROP TABLE #AssignmentsAfter;
GO

-- ============================================================
-- 2b / 3b. Drop the redundant / non-atomic columns
-- ============================================================
ALTER TABLE ScoreEditRequest DROP COLUMN OldValue;
GO

ALTER TABLE AuditLog DROP COLUMN OldValue;
GO

ALTER TABLE AuditLog DROP COLUMN NewValue;
GO
