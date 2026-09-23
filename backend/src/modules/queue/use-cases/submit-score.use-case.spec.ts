import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SubmitScoreUseCase } from './submit-score.use-case';
import { FakeQueueRepository, makeQueueItem } from '../../../testing/fake-queue.repository';
import { FakeStudentsRepository, makeStudent } from '../../../testing/fake-students.repository';
import { FakeScoresRepository } from '../../../testing/fake-scores.repository';
import { FakeSettingsRepository } from '../../../testing/fake-settings.repository';
import { FakeAuditLogRepository } from '../../../testing/fake-audit-log.repository';
import { FakeTransactionRunner } from '../../../testing/fake-transaction-runner';

function setUp() {
  const queueRepo = new FakeQueueRepository();
  const studentsRepo = new FakeStudentsRepository();
  const scoresRepo = new FakeScoresRepository();
  const settingsRepo = new FakeSettingsRepository();
  const auditLogRepo = new FakeAuditLogRepository();
  const txRunner = new FakeTransactionRunner();

  const useCase = new SubmitScoreUseCase(
    queueRepo,
    studentsRepo,
    scoresRepo,
    settingsRepo,
    auditLogRepo,
    txRunner,
  );

  queueRepo.seed(
    makeQueueItem({
      id: 'q1',
      schoolId: 'school-1',
      status: 'IN_PROGRESS',
      claimedByUserId: 'judge-1',
    }),
  );
  for (let i = 1; i <= 6; i++) {
    studentsRepo.seed(makeStudent({ id: `s${i}`, schoolId: 'school-1', seqNo: i }));
  }

  return { queueRepo, studentsRepo, scoresRepo, settingsRepo, auditLogRepo, useCase };
}

const fullTeamScores = [1, 2, 3, 4, 5, 6].map((i) => ({ studentId: `s${i}`, value: 7.5 }));

describe('SubmitScoreUseCase', () => {
  it('closes the queue item and writes a paired AuditLog row per score when the team is complete', async () => {
    const { useCase, queueRepo, scoresRepo, auditLogRepo } = setUp();

    await useCase.execute({ queueItemId: 'q1', judgeId: 'judge-1', scores: fullTeamScores });

    const item = await queueRepo.findById('q1');
    expect(item?.status).toBe('DONE');
    expect(scoresRepo.scores).toHaveLength(6);
    expect(auditLogRepo.entries).toHaveLength(6);
    expect(auditLogRepo.entries.every((e) => e.entityType === 'Score')).toBe(true);
  });

  it('rejects with 400 and closes nothing when a student is missing from the submission (SPEC §8.6)', async () => {
    const { useCase, queueRepo, scoresRepo } = setUp();
    const incomplete = fullTeamScores.slice(0, 5); // only 5 of 6

    await expect(
      useCase.execute({ queueItemId: 'q1', judgeId: 'judge-1', scores: incomplete }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const item = await queueRepo.findById('q1');
    expect(item?.status).toBe('IN_PROGRESS'); // never closed
    expect(scoresRepo.scores).toHaveLength(0); // nothing partially written
  });

  it('rejects with 400 when an extra student outside the roster is submitted', async () => {
    const { useCase } = setUp();
    const withExtra = [...fullTeamScores, { studentId: 's999', value: 5 }];

    await expect(
      useCase.execute({ queueItemId: 'q1', judgeId: 'judge-1', scores: withExtra }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects with 403 when scoring is globally locked, even for the item owner (SPEC §8.6)', async () => {
    const { useCase, settingsRepo, scoresRepo } = setUp();
    settingsRepo.seed({ scoringLocked: true });

    await expect(
      useCase.execute({ queueItemId: 'q1', judgeId: 'judge-1', scores: fullTeamScores }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(scoresRepo.scores).toHaveLength(0);
  });

  it('rejects with 403 when the caller does not currently hold this queue item', async () => {
    const { useCase } = setUp();

    await expect(
      useCase.execute({ queueItemId: 'q1', judgeId: 'someone-else', scores: fullTeamScores }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects with 400 for an out-of-range score value', async () => {
    const { useCase } = setUp();
    const bad = [...fullTeamScores.slice(0, 5), { studentId: 's6', value: 15 }];

    await expect(
      useCase.execute({ queueItemId: 'q1', judgeId: 'judge-1', scores: bad }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
