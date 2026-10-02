import { ResetQueueRepository, ResetQueueResult } from '../modules/admin/reset-queue.repository';

export class FakeResetQueueRepository extends ResetQueueRepository {
  calls = 0;
  result: ResetQueueResult = {
    scoresDeleted: 0,
    editRequestsDeleted: 0,
    auditRowsDeleted: 0,
    queueItemsRewound: 0,
  };

  seedResult(result: Partial<ResetQueueResult>): void {
    this.result = { ...this.result, ...result };
  }

  async resetAll(): Promise<ResetQueueResult> {
    this.calls++;
    return this.result;
  }
}
