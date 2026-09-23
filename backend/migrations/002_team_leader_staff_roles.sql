-- 002_team_leader_staff_roles.sql
-- Role model refactor: MENTOR -> TEAM_LEADER (renamed, extended with score
-- approval powers), plus a new STAFF role (delegated queue/scoring operator).
-- See CLAUDE.md / the role-model refactor plan for the full rationale.
--
-- Guards (IF EXISTS / COL_LENGTH) make this migration safe to re-run even if
-- an earlier attempt partially applied outside the transactional runner.

IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_User_Role' AND parent_object_id = OBJECT_ID('dbo.[User]')
)
    ALTER TABLE [User] DROP CONSTRAINT CK_User_Role;

-- 'TEAM_LEADER' (11 chars) doesn't fit the original VARCHAR(10).
ALTER TABLE [User] ALTER COLUMN Role VARCHAR(20) NOT NULL;

UPDATE [User] SET Role = 'TEAM_LEADER' WHERE Role = 'MENTOR';

ALTER TABLE [User] ADD CONSTRAINT CK_User_Role
    CHECK (Role IN ('ADMIN', 'COMMITTEE', 'STAFF', 'TEAM_LEADER'));

-- Pre-registered signature image (PNG/JPEG), uploaded later by an admin via
-- POST /admin/users/:id/signature. NULL until uploaded — the score-approval
-- use case must treat a missing signature as a hard error, never skip it.
IF COL_LENGTH('dbo.[User]', 'SignaturePath') IS NULL
    ALTER TABLE [User] ADD SignaturePath NVARCHAR(500) NULL;
