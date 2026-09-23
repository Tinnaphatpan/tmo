// Domain entities (SPEC.md §2.1). Plain types — no ORM, no decorators here;
// repositories map raw mssql recordset rows onto these.

export type Role = 'ADMIN' | 'COMMITTEE' | 'MENTOR';

export type QueueStatus = 'WAITING' | 'IN_PROGRESS' | 'DONE';

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
}

export interface CommitteeAssignment {
  id: string;
  userId: string;
  problemNumber: number;
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
