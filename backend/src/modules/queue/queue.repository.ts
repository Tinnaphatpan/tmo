import { QueueItem, QueueStatus } from '../../domain/entities';
import { Executor } from '../../database/types';

export interface QueueItemWithSchool extends QueueItem {
  schoolName: string;
  schoolCode: string | null;
}

export interface StatusCounts {
  waiting: number;
  inProgress: number;
  done: number;
  total: number;
}

export interface ProblemCounts {
  problemNumber: number;
  total: number;
  done: number;
  inProgress: number;
}

export abstract class QueueRepository {
  abstract findAllWithSchool(executor?: Executor): Promise<QueueItemWithSchool[]>;
  abstract findByProblemNumbersWithSchool(
    problemNumbers: number[],
    executor?: Executor,
  ): Promise<QueueItemWithSchool[]>;
  abstract findById(id: string, executor?: Executor): Promise<QueueItem | null>;
  abstract findByIdWithSchool(id: string, executor?: Executor): Promise<QueueItemWithSchool | null>;
  abstract findActiveClaimByUser(userId: string, executor?: Executor): Promise<QueueItem | null>;

  /**
   * Atomic claim (SPEC §2.6): only succeeds if the row is still WAITING and
   * unclaimed at the moment the UPDATE runs — the DB's WHERE clause is the
   * only thing that decides the race, never an app-level check-then-write.
   * Returns true iff this call was the one that won it.
   */
  abstract claim(id: string, userId: string, executor?: Executor): Promise<boolean>;
  abstract release(id: string, executor?: Executor): Promise<void>;
  /**
   * Requires a transaction — must always land alongside the Score writes it
   * closes out (SPEC §1.4). Closes the item as DONE and opens the approval
   * workflow (ApprovalStatus='PENDING', SubmittedByUserId=submittedByUserId).
   */
  abstract markPendingApproval(
    id: string,
    submittedByUserId: string,
    executor: Executor,
  ): Promise<void>;
  /** Requires a transaction — TEAM_LEADER approval, sets ApprovedByUserId/ApprovedAt/DocumentPath. */
  abstract approve(
    id: string,
    approvedByUserId: string,
    documentPath: string | null,
    executor: Executor,
  ): Promise<void>;
  abstract findPendingApprovalBySchool(
    schoolId: string,
    executor?: Executor,
  ): Promise<QueueItemWithSchool[]>;
  /** Overwrites only DocumentPath — used when a score revision regenerates
   * the PDF after the item was already approved (ApprovedByUserId/ApprovedAt
   * stay as the original approval's, per the confirmed no-version-history design). */
  abstract updateDocumentPath(
    id: string,
    documentPath: string,
    executor?: Executor,
  ): Promise<void>;

  abstract create(
    input: { schoolId: string; problemNumber: number; position: number; scheduledAt: Date | null },
    executor?: Executor,
  ): Promise<QueueItem>;
  abstract updatePosition(id: string, position: number, executor?: Executor): Promise<void>;
  abstract delete(id: string, executor?: Executor): Promise<void>;

  abstract findStaleInProgress(
    thresholdMinutes: number,
    executor?: Executor,
  ): Promise<QueueItemWithSchool[]>;
  abstract countByStatus(executor?: Executor): Promise<StatusCounts>;
  abstract countByProblem(executor?: Executor): Promise<ProblemCounts[]>;
  abstract existsForSchoolAndProblem(
    schoolId: string,
    problemNumber: number,
    executor?: Executor,
  ): Promise<boolean>;
}

export const QUEUE_STATUSES: QueueStatus[] = ['WAITING', 'IN_PROGRESS', 'DONE'];
