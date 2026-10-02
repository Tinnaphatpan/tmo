import { Executor } from '../../database/types';

export interface ResetQueueResult {
  scoresDeleted: number;
  editRequestsDeleted: number;
  auditRowsDeleted: number;
  queueItemsRewound: number;
}

/**
 * Admin-triggered equivalent of `npm run reset:test -- --yes`
 * (database/reset-test-run.ts), exposed as POST /admin/queue/reset so an
 * admin can rewind a test round from the UI instead of needing shell/DB
 * access. Deletes every Score, ScoreEditRequest and score-related AuditLog
 * row, rewinds every QueueItem to WAITING (unclaimed, un-approved, no PDF),
 * and unlocks scoring. Schools, students, users, signatures and the
 * schedule itself (Position/ScheduledAt) are left untouched — only
 * ResetQueueUseCase decides *whether* this may run (NODE_ENV guard); this
 * repository always executes the reset it's asked to.
 */
export abstract class ResetQueueRepository {
  abstract resetAll(executor: Executor): Promise<ResetQueueResult>;
}
