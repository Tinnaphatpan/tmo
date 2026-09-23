import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ApproveScoreSetUseCase } from './approve-score-set.use-case';
import { FakeQueueRepository, makeQueueItem } from '../../../testing/fake-queue.repository';
import { FakeUsersRepository, makeUser } from '../../../testing/fake-users.repository';
import { FakeTransactionRunner } from '../../../testing/fake-transaction-runner';

function setUp(overrides?: {
  judgeSignaturePath?: string | null;
  leaderSignaturePath?: string | null;
}) {
  const queueRepo = new FakeQueueRepository();
  const usersRepo = new FakeUsersRepository();
  const txRunner = new FakeTransactionRunner();
  const useCase = new ApproveScoreSetUseCase(queueRepo, usersRepo, txRunner);

  usersRepo.seed(
    makeUser({
      id: 'judge-1',
      role: 'COMMITTEE',
      signaturePath:
        overrides?.judgeSignaturePath !== undefined ? overrides.judgeSignaturePath : '/sig/judge-1.png',
    }),
  );
  usersRepo.seed(
    makeUser({
      id: 'leader-1',
      role: 'TEAM_LEADER',
      schoolId: 'school-1',
      signaturePath:
        overrides?.leaderSignaturePath !== undefined ? overrides.leaderSignaturePath : '/sig/leader-1.png',
    }),
  );
  usersRepo.seed(
    makeUser({ id: 'leader-2', role: 'TEAM_LEADER', schoolId: 'school-2', signaturePath: '/sig/leader-2.png' }),
  );

  queueRepo.seed(
    makeQueueItem({
      id: 'q1',
      schoolId: 'school-1',
      status: 'DONE',
      approvalStatus: 'PENDING',
      submittedByUserId: 'judge-1',
    }),
  );

  return { queueRepo, usersRepo, useCase };
}

describe('ApproveScoreSetUseCase', () => {
  it('approves a pending score set for the team leader’s own school', async () => {
    const { useCase, queueRepo } = setUp();

    await useCase.execute({ queueItemId: 'q1', teamLeaderId: 'leader-1' });

    const item = await queueRepo.findById('q1');
    expect(item?.approvalStatus).toBe('APPROVED');
    expect(item?.approvedByUserId).toBe('leader-1');
    expect(item?.approvedAt).not.toBeNull();
  });

  it('rejects with 403 when the team leader belongs to a different school (SPEC §4.4 IDOR guard)', async () => {
    const { useCase } = setUp();

    await expect(
      useCase.execute({ queueItemId: 'q1', teamLeaderId: 'leader-2' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects with 409 when the item is not in PENDING approval status', async () => {
    const { useCase, queueRepo } = setUp();
    await useCase.execute({ queueItemId: 'q1', teamLeaderId: 'leader-1' }); // already approved

    await expect(
      useCase.execute({ queueItemId: 'q1', teamLeaderId: 'leader-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect((await queueRepo.findById('q1'))?.approvalStatus).toBe('APPROVED');
  });

  it('rejects with 400 when the submitting judge has no signature on file', async () => {
    const { useCase } = setUp({ judgeSignaturePath: null });

    await expect(
      useCase.execute({ queueItemId: 'q1', teamLeaderId: 'leader-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects with 400 when the team leader has no signature on file', async () => {
    const { useCase } = setUp({ leaderSignaturePath: null });

    await expect(
      useCase.execute({ queueItemId: 'q1', teamLeaderId: 'leader-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
