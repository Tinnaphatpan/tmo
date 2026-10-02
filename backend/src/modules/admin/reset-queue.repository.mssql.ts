import { Injectable } from '@nestjs/common';
import { Executor, request } from '../../database/types';
import { ResetQueueRepository, ResetQueueResult } from './reset-queue.repository';

@Injectable()
export class MssqlResetQueueRepository extends ResetQueueRepository {
  /** Always called inside a transaction handed out by TransactionRunner — see ResetQueueUseCase. */
  async resetAll(executor: Executor): Promise<ResetQueueResult> {
    const run = async (query: string): Promise<number> =>
      (await request(executor).query(query)).rowsAffected[0] ?? 0;

    const editRequestsDeleted = await run('DELETE FROM ScoreEditRequest');
    const scoresDeleted = await run('DELETE FROM Score');
    const auditRowsDeleted = await run(
      "DELETE FROM AuditLog WHERE EntityType = 'Score' OR Action LIKE 'SCORE_%'",
    );
    const queueItemsRewound = await run(`
      UPDATE QueueItem SET Status = 'WAITING', ClaimedByUserId = NULL, ClaimedAt = NULL,
        CompletedAt = NULL, SubmittedByUserId = NULL, ApprovalStatus = 'NOT_SUBMITTED',
        ApprovedByUserId = NULL, ApprovedAt = NULL, DocumentPath = NULL
    `);
    await run('UPDATE CompetitionSettings SET ScoringLocked = 0, LockedAt = NULL, LockedBy = NULL');

    return { scoresDeleted, editRequestsDeleted, auditRowsDeleted, queueItemsRewound };
  }
}
