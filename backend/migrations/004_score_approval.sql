-- 004_score_approval.sql
-- Score approval workflow: once COMMITTEE/STAFF submit a full score set for a
-- QueueItem, it no longer closes straight to "done" — it waits for the
-- school's TEAM_LEADER to approve (which will trigger e-signature + PDF
-- generation, added in a later migration-free phase since it only needs new
-- application code, not schema).
--
-- QueueItem.Status itself is untouched (stays WAITING/IN_PROGRESS/DONE) —
-- ApprovalStatus is an orthogonal column that only matters once
-- Status='DONE', so rotation math and public-board counts need no changes.
--
-- GO separators are required: SQL Server won't let a statement reference a
-- column an earlier ALTER TABLE...ADD in the *same batch* just added.

ALTER TABLE QueueItem ADD SubmittedByUserId UNIQUEIDENTIFIER NULL;
GO
ALTER TABLE QueueItem ADD CONSTRAINT FK_QueueItem_SubmittedByUser
    FOREIGN KEY (SubmittedByUserId) REFERENCES [User] (Id) ON DELETE NO ACTION;

ALTER TABLE QueueItem ADD ApprovalStatus VARCHAR(20) NOT NULL
    CONSTRAINT DF_QueueItem_ApprovalStatus DEFAULT 'NOT_SUBMITTED';
GO
ALTER TABLE QueueItem ADD CONSTRAINT CK_QueueItem_ApprovalStatus
    CHECK (ApprovalStatus IN ('NOT_SUBMITTED', 'PENDING', 'APPROVED'));

ALTER TABLE QueueItem ADD ApprovedByUserId UNIQUEIDENTIFIER NULL;
GO
ALTER TABLE QueueItem ADD CONSTRAINT FK_QueueItem_ApprovedByUser
    FOREIGN KEY (ApprovedByUserId) REFERENCES [User] (Id) ON DELETE NO ACTION;
ALTER TABLE QueueItem ADD ApprovedAt DATETIME2 NULL;
ALTER TABLE QueueItem ADD DocumentPath NVARCHAR(500) NULL;
GO

CREATE INDEX IX_QueueItem_ApprovalStatus ON QueueItem (ApprovalStatus);

-- Backfill: everything already closed out under the old model had no
-- approval concept and shouldn't retroactively block anyone on it — treat
-- it as already-approved. Anything still open just hasn't been submitted yet.
UPDATE QueueItem
SET ApprovalStatus = CASE WHEN Status = 'DONE' THEN 'APPROVED' ELSE 'NOT_SUBMITTED' END;
