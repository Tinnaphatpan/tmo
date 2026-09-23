import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateScoreEditRequestUseCase } from './create-score-edit-request.use-case';
import { ReviewScoreEditRequestUseCase } from './review-score-edit-request.use-case';
import { FakeScoresRepository } from '../../../testing/fake-scores.repository';
import { FakeScoreEditRequestsRepository } from '../../../testing/fake-score-edit-requests.repository';
import { FakeAuditLogRepository } from '../../../testing/fake-audit-log.repository';
import { FakeTransactionRunner } from '../../../testing/fake-transaction-runner';

function setUp() {
  const scoresRepo = new FakeScoresRepository();
  const editRequestsRepo = new FakeScoreEditRequestsRepository();
  const auditLogRepo = new FakeAuditLogRepository();
  const txRunner = new FakeTransactionRunner();

  const createUseCase = new CreateScoreEditRequestUseCase(scoresRepo, editRequestsRepo);
  const reviewUseCase = new ReviewScoreEditRequestUseCase(
    editRequestsRepo,
    scoresRepo,
    auditLogRepo,
    txRunner,
  );

  return { scoresRepo, editRequestsRepo, auditLogRepo, createUseCase, reviewUseCase };
}

describe('Score edit request flow (SPEC §8.6 last item)', () => {
  it('lets the owning judge request an edit, and admin approval writes the new Score value + one AuditLog row', async () => {
    const { scoresRepo, createUseCase, reviewUseCase, auditLogRepo } = setUp();
    const { score } = await scoresRepo.upsertOne(
      { studentId: 's1', queueItemId: 'q1', value: 5, judgeId: 'judge-1' },
    );

    const request = await createUseCase.execute({
      scoreId: score.id,
      judgeId: 'judge-1',
      newValue: 8,
      reason: 'คิดคะแนนผิด นับขั้นตอนไม่ครบ',
    });
    expect(request.status).toBe('PENDING');

    await reviewUseCase.execute({ requestId: request.id, action: 'approve', reviewerId: 'admin-1' });

    const updated = await scoresRepo.findById(score.id);
    expect(updated?.value).toBe(8);
    expect(auditLogRepo.entries).toHaveLength(1);
    expect(auditLogRepo.entries[0]).toMatchObject({
      action: 'SCORE_EDIT_APPROVED',
      entityType: 'Score',
      entityId: score.id,
      oldValue: '5.00',
      newValue: '8.00',
      performedBy: 'admin-1',
    });
  });

  it('rejecting leaves the Score untouched and writes no AuditLog entry', async () => {
    const { scoresRepo, createUseCase, reviewUseCase, auditLogRepo } = setUp();
    const { score } = await scoresRepo.upsertOne(
      { studentId: 's1', queueItemId: 'q1', value: 5, judgeId: 'judge-1' },
    );
    const request = await createUseCase.execute({
      scoreId: score.id,
      judgeId: 'judge-1',
      newValue: 8,
      reason: 'reason',
    });

    await reviewUseCase.execute({ requestId: request.id, action: 'reject', reviewerId: 'admin-1' });

    const unchanged = await scoresRepo.findById(score.id);
    expect(unchanged?.value).toBe(5);
    expect(auditLogRepo.entries).toHaveLength(0);
  });

  it('rejects a second review of the same request with 409', async () => {
    const { scoresRepo, createUseCase, reviewUseCase } = setUp();
    const { score } = await scoresRepo.upsertOne(
      { studentId: 's1', queueItemId: 'q1', value: 5, judgeId: 'judge-1' },
    );
    const request = await createUseCase.execute({
      scoreId: score.id,
      judgeId: 'judge-1',
      newValue: 8,
      reason: 'reason',
    });
    await reviewUseCase.execute({ requestId: request.id, action: 'approve', reviewerId: 'admin-1' });

    await expect(
      reviewUseCase.execute({ requestId: request.id, action: 'reject', reviewerId: 'admin-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects with 403 when a judge tries to request an edit on a score they did not record', async () => {
    const { scoresRepo, createUseCase } = setUp();
    const { score } = await scoresRepo.upsertOne(
      { studentId: 's1', queueItemId: 'q1', value: 5, judgeId: 'judge-1' },
    );

    await expect(
      createUseCase.execute({
        scoreId: score.id,
        judgeId: 'someone-else',
        newValue: 8,
        reason: 'reason',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
