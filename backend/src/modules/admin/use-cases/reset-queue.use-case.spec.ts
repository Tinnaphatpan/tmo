import { ForbiddenException } from '@nestjs/common';
import { FakeResetQueueRepository } from '../../../testing/fake-reset-queue.repository';
import { FakeAuditLogRepository } from '../../../testing/fake-audit-log.repository';
import { FakeTransactionRunner } from '../../../testing/fake-transaction-runner';
import { ResetQueueUseCase } from './reset-queue.use-case';

describe('ResetQueueUseCase', () => {
  let resetQueue: FakeResetQueueRepository;
  let audit: FakeAuditLogRepository;
  let useCase: ResetQueueUseCase;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    resetQueue = new FakeResetQueueRepository();
    audit = new FakeAuditLogRepository();
    useCase = new ResetQueueUseCase(resetQueue, audit, new FakeTransactionRunner());
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('resets the queue and records a QUEUE_RESET audit row attributed to the caller', async () => {
    process.env.NODE_ENV = 'test';
    resetQueue.seedResult({ scoresDeleted: 12, editRequestsDeleted: 3, auditRowsDeleted: 15, queueItemsRewound: 80 });

    const result = await useCase.execute('admin-1');

    expect(result).toEqual({ scoresDeleted: 12, editRequestsDeleted: 3, auditRowsDeleted: 15, queueItemsRewound: 80 });
    expect(resetQueue.calls).toBe(1);
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      action: 'QUEUE_RESET',
      entityType: 'Queue',
      entityId: 'reset',
      performedBy: 'admin-1',
    });
    expect(JSON.parse(audit.entries[0].newValue!)).toEqual(result);
  });

  it('refuses to run when NODE_ENV=production, and performs no reset or audit write', async () => {
    process.env.NODE_ENV = 'production';

    await expect(useCase.execute('admin-1')).rejects.toThrow(ForbiddenException);
    expect(resetQueue.calls).toBe(0);
    expect(audit.entries).toHaveLength(0);
  });
});
