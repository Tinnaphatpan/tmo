// Domain entities (SPEC.md §2.1). Plain types — no ORM, no decorators here;
// repositories map raw mssql recordset rows onto these.

export type Role = 'ADMIN' | 'COMMITTEE' | 'STAFF' | 'TEAM_LEADER';

export type QueueStatus = 'WAITING' | 'IN_PROGRESS' | 'DONE';

/** Orthogonal to QueueStatus — only meaningful once Status='DONE'. */
export type ApprovalStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED';

export type ScoreEditRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface School {
  id: string;
  name: string;
  code: string | null;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: Role;
  schoolId: string | null;
  signaturePath: string | null;
}

/** SchoolId null = scoped to this problem number across all schools (COMMITTEE's original semantics). */
export interface UserAssignment {
  id: string;
  userId: string;
  problemNumber: number;
  schoolId: string | null;
}

export interface QueueItem {
  id: string;
  schoolId: string;
  problemNumber: number;
  status: QueueStatus;
  position: number;
  scheduledAt: Date | null;
  claimedByUserId: string | null;
  claimedAt: Date | null;
  completedAt: Date | null;
  submittedByUserId: string | null;
  approvalStatus: ApprovalStatus;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  documentPath: string | null;
}

export interface Student {
  id: string;
  studentCode: string;
  seqNo: number;
  name: string;
  schoolId: string;
}

export interface Score {
  id: string;
  studentId: string;
  queueItemId: string;
  value: number;
  judgeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompetitionSettings {
  id: 1;
  scoringLocked: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
}

export interface ScoreEditRequest {
  id: string;
  scoreId: string;
  requestedBy: string;
  oldValue: number;
  newValue: number;
  reason: string;
  status: ScoreEditRequestStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  performedBy: string;
  createdAt: Date;
}
