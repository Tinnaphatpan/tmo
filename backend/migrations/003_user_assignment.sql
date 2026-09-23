-- 003_user_assignment.sql
-- Generalizes CommitteeAssignment -> UserAssignment so it can also scope
-- STAFF delegation (problem number + optional school), not just COMMITTEE's
-- problem-number-only scope. SchoolId NULL keeps today's COMMITTEE semantics
-- ("this problem number, every school"); non-NULL scopes a STAFF member to
-- one school for that problem number.

EXEC sp_rename 'CommitteeAssignment', 'UserAssignment';
-- Constraint/index names (PK_CommitteeAssignment, FK_CommitteeAssignment_User,
-- IX_CommitteeAssignment_UserId) are left as-is — sp_rename on the table
-- doesn't rename them, and renaming them too is purely cosmetic.

ALTER TABLE UserAssignment ADD SchoolId UNIQUEIDENTIFIER NULL;

-- NO ACTION: School already has NO-ACTION FKs converging from User and
-- QueueItem (see 001_init.sql's comment on FK_QueueItem_School) — MSSQL
-- rejects multiple cascade paths onto the same table, so this follows the
-- same precedent. App code must clear/deny School deletion while
-- UserAssignment rows still reference it.
ALTER TABLE UserAssignment ADD CONSTRAINT FK_UserAssignment_School
    FOREIGN KEY (SchoolId) REFERENCES School (Id) ON DELETE NO ACTION;

ALTER TABLE UserAssignment DROP CONSTRAINT UQ_CommitteeAssignment_User_Problem;

-- Note: SQL Server's plain UNIQUE treats multiple NULLs as distinct, so this
-- does NOT by itself stop two (user, problem, NULL) rows from coexisting —
-- that de-duplication is enforced at the application layer (in the
-- admin use-cases that write these rows), matching this codebase's existing
-- precedent of avoiding filtered indexes (see 001_init.sql's comment on
-- IX_QueueItem_ClaimedByUserId).
ALTER TABLE UserAssignment ADD CONSTRAINT UQ_UserAssignment_User_Problem_School
    UNIQUE (UserId, ProblemNumber, SchoolId);

CREATE INDEX IX_UserAssignment_SchoolId ON UserAssignment (SchoolId);
