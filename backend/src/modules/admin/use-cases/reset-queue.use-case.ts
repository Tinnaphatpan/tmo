import { ForbiddenException, Injectable } from '@nestjs/common';
import { TransactionRunner } from '../../../database/transaction-runner';
import { AuditLogRepository } from '../../audit-log/audit-log.repository';
import { ResetQueueRepository, ResetQueueResult } from '../reset-queue.repository';

/**
 * POST /admin/queue/reset — the UI-reachable equivalent of
 * `npm run reset:test -- --yes`. Same NODE_ENV=production refusal as that
 * script (this is a round-rewind tool for test/rehearsal rounds, never a
 * production operation), logged as a QUEUE_RESET AuditLog row so there's a
 * record even though the Score-related rows it just deleted are gone.
 */
@Injectable()
export class ResetQueueUseCase {
  constructor(
    private readonly resetQueueRepository: ResetQueueRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(actorId: string): Promise<ResetQueueResult> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('ปิดใช้งานการล้างคิวในสภาพแวดล้อม production');
    }

    return this.transactionRunner.run(async (tx) => {
      const result = await this.resetQueueRepository.resetAll(tx);
      await this.auditLogRepository.create(
        {
          action: 'QUEUE_RESET',
          entityType: 'Queue',
          entityId: 'reset',
          oldValue: null,
          newValue: JSON.stringify(result),
          performedBy: actorId,
        },
        tx,
      );
      return result;
    });
  }
}
