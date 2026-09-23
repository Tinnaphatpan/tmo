import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateScoreEditRequestUseCase } from './create-score-edit-request.use-case';
import { ReviewScoreEditRequestUseCase } from './review-score-edit-request.use-case';
import { ScoreSheetGenerator } from '../../approval/score-sheet-generator';
import { FakeScoresRepository } from '../../../testing/fake-scores.repository';
import { FakeScoreEditRequestsRepository } from '../../../testing/fake-score-edit-requests.repository';
import { FakeQueueRepository, makeQueueItem } from '../../../testing/fake-queue.repository';
import { FakeUsersRepository, makeUser } from '../../../testing/fake-users.repository';
import { FakeSchoolsRepository } from '../../../testing/fake-schools.repository';
import { FakeStudentsRepository, makeStudent } from '../../../testing/fake-students.repository';
import { FakeAuditLogRepository } from '../../../testing/fake-audit-log.repository';
import { FakeTransactionRunner } from '../../../testing/fake-transaction-runner';
import { FakeFileStorage } from '../../../testing/fake-file-storage';

const FIXTURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function setUp() {
  const scoresRepo = new FakeScoresRepository();
  const editRequestsRepo = new FakeScoreEditRequestsRepository();
  const queueRepo = new FakeQueueRepository();
  const usersRepo = new FakeUsersRepository();
  const schoolsRepo = new FakeSchoolsRepository();
  const studentsRepo = new FakeStudentsRepository();
  const auditLogRepo = new FakeAuditLogRepository();
  const txRunner = new FakeTransactionRunner();
  const fileStorage = new FakeFileStorage();
  const scoreSheetGenerator = new ScoreSheetGenerator(
    usersRepo,
    schoolsRepo,
    studentsRepo,
    scoresRepo,
    fileStorage,
  );

  const createUseCase = new CreateScoreEditRequestUseCase(scoresRepo, editRequestsRepo);
  const reviewUseCase = new ReviewScoreEditRequestUseCase(
    editRequestsRepo,
    scoresRepo,
    queueRepo,
    auditLogRepo,
    scoreSheetGenerator,
    txRunner,
  );

  queueRepo.seed(makeQueueItem({ id: 'q1', schoolId: 'school-1' }));
  schoolsRepo.seed({ id: 'school-1', name: 'โรงเรียน A', code: 'A' });
  studentsRepo.seed(makeStudent({ id: 's1', schoolId: 'school-1', seqNo: 1 }));
  usersRepo.seed(makeUser({ id: 'judge-1', role: 'COMMITTEE', signaturePath: '/sig/judge-1.png' }));
  usersRepo.seed(
    makeUser({ id: 'leader-1', role: 'TEAM_LEADER', schoolId: 'school-1', signaturePath: '/sig/leader-1.png' }),
  );
  fileStorage.signatures.set('/sig/judge-1.png', FIXTURE_PNG);
  fileStorage.signatures.set('/sig/leader-1.png', FIXTURE_PNG);

  return {
    scoresRepo,
    editRequestsRepo,
    queueRepo,
    auditLogRepo,
    fileStorage,
    createUseCase,
    reviewUseCase,
  };
}

describe('Score edit request flow (SPEC §8.6 last item)', () => {
  it('lets the owning judge request an edit, and the school’s team leader approving it writes the new Score value + one AuditLog row', async () => {
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

    await reviewUseCase.execute({
      requestId: request.id,
      action: 'approve',
      reviewerId: 'leader-1',
      reviewerSchoolId: 'school-1',
    });

    const updated = await scoresRepo.findById(score.id);
    expect(updated?.value).toBe(8);
    expect(auditLogRepo.entries).toHaveLength(1);
    expect(auditLogRepo.entries[0]).toMatchObject({
      action: 'SCORE_EDIT_APPROVED',
      entityType: 'Score',
      entityId: score.id,
      oldValue: '5.00',
      newValue: '8.00',
      performedBy: 'leader-1',
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

    await reviewUseCase.execute({
      requestId: request.id,
      action: 'reject',
      reviewerId: 'leader-1',
      reviewerSchoolId: 'school-1',
    });

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
    await reviewUseCase.execute({
      requestId: request.id,
      action: 'approve',
      reviewerId: 'leader-1',
      reviewerSchoolId: 'school-1',
    });

    await expect(
      reviewUseCase.execute({
        requestId: request.id,
        action: 'reject',
        reviewerId: 'leader-1',
        reviewerSchoolId: 'school-1',
      }),
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

  it('rejects with 403 when a team leader from a different school tries to review the request (SPEC §4.4 IDOR guard)', async () => {
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

    await expect(
      reviewUseCase.execute({
        requestId: request.id,
        action: 'approve',
        reviewerId: 'leader-2',
        reviewerSchoolId: 'school-2',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('regenerates the score-sheet PDF with the corrected value when the queue item was already approved', async () => {
    const { scoresRepo, createUseCase, reviewUseCase, queueRepo, fileStorage } = setUp();
    const { score } = await scoresRepo.upsertOne(
      { studentId: 's1', queueItemId: 'q1', value: 5, judgeId: 'judge-1' },
    );
    // Simulate the item having already gone through ApproveScoreSetUseCase.
    const item = await queueRepo.findById('q1');
    item!.approvalStatus = 'APPROVED';
    item!.submittedByUserId = 'judge-1';
    item!.approvedByUserId = 'leader-1';
    item!.documentPath = 'fake://pdf/q1-old.pdf';

    const request = await createUseCase.execute({
      scoreId: score.id,
      judgeId: 'judge-1',
      newValue: 9,
      reason: 'แก้ไขคะแนน',
    });
    await reviewUseCase.execute({
      requestId: request.id,
      action: 'approve',
      reviewerId: 'leader-1',
      reviewerSchoolId: 'school-1',
    });

    const updatedItem = await queueRepo.findById('q1');
    expect(updatedItem?.approvedByUserId).toBe('leader-1'); // unchanged — same sign-off
    expect(updatedItem?.documentPath).not.toBe('fake://pdf/q1-old.pdf');
    expect(fileStorage.pdfs.has(updatedItem!.documentPath!)).toBe(true);
  });
});
