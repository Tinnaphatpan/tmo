import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ApproveScoreSetUseCase } from './approve-score-set.use-case';
import { ScoreSheetGenerator } from '../score-sheet-generator';
import { FakeQueueRepository, makeQueueItem } from '../../../testing/fake-queue.repository';
import { FakeUsersRepository, makeUser } from '../../../testing/fake-users.repository';
import { FakeSchoolsRepository } from '../../../testing/fake-schools.repository';
import { FakeStudentsRepository, makeStudent } from '../../../testing/fake-students.repository';
import { FakeScoresRepository } from '../../../testing/fake-scores.repository';
import { FakeTransactionRunner } from '../../../testing/fake-transaction-runner';
import { FakeFileStorage } from '../../../testing/fake-file-storage';

// Smallest valid PNG (1x1 transparent pixel) — pdfkit inspects real magic
// bytes/image data when embedding, so a fixture must be an actual image.
const FIXTURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function setUp(overrides?: {
  judgeSignaturePath?: string | null;
  leaderSignaturePath?: string | null;
}) {
  const queueRepo = new FakeQueueRepository();
  const usersRepo = new FakeUsersRepository();
  const schoolsRepo = new FakeSchoolsRepository();
  const studentsRepo = new FakeStudentsRepository();
  const scoresRepo = new FakeScoresRepository();
  const txRunner = new FakeTransactionRunner();
  const fileStorage = new FakeFileStorage();
  const scoreSheetGenerator = new ScoreSheetGenerator(
    usersRepo,
    schoolsRepo,
    studentsRepo,
    scoresRepo,
    fileStorage,
  );
  const useCase = new ApproveScoreSetUseCase(queueRepo, usersRepo, scoreSheetGenerator, txRunner);

  const judgeSignaturePath =
    overrides?.judgeSignaturePath !== undefined ? overrides.judgeSignaturePath : '/sig/judge-1.png';
  const leaderSignaturePath =
    overrides?.leaderSignaturePath !== undefined ? overrides.leaderSignaturePath : '/sig/leader-1.png';

  if (judgeSignaturePath) fileStorage.signatures.set(judgeSignaturePath, FIXTURE_PNG);
  if (leaderSignaturePath) fileStorage.signatures.set(leaderSignaturePath, FIXTURE_PNG);

  usersRepo.seed(makeUser({ id: 'judge-1', role: 'COMMITTEE', signaturePath: judgeSignaturePath }));
  usersRepo.seed(
    makeUser({
      id: 'leader-1',
      role: 'TEAM_LEADER',
      schoolId: 'school-1',
      signaturePath: leaderSignaturePath,
    }),
  );
  usersRepo.seed(
    makeUser({ id: 'leader-2', role: 'TEAM_LEADER', schoolId: 'school-2', signaturePath: '/sig/leader-2.png' }),
  );
  const adminSignaturePath = '/sig/admin-1.png';
  fileStorage.signatures.set(adminSignaturePath, FIXTURE_PNG);
  usersRepo.seed(
    makeUser({ id: 'admin-1', role: 'ADMIN', schoolId: null, signaturePath: adminSignaturePath }),
  );

  schoolsRepo.seed({ id: 'school-1', name: 'โรงเรียน A', code: 'A' });
  studentsRepo.seed(makeStudent({ id: 's1', schoolId: 'school-1', seqNo: 1 }));

  queueRepo.seed(
    makeQueueItem({
      id: 'q1',
      schoolId: 'school-1',
      status: 'DONE',
      approvalStatus: 'PENDING',
      submittedByUserId: 'judge-1',
    }),
  );

  return { queueRepo, usersRepo, fileStorage, useCase };
}

describe('ApproveScoreSetUseCase', () => {
  it('approves a pending score set for the team leader’s own school and generates a PDF', async () => {
    const { useCase, queueRepo, fileStorage } = setUp();

    await useCase.execute({ queueItemId: 'q1', teamLeaderId: 'leader-1' });

    const item = await queueRepo.findById('q1');
    expect(item?.approvalStatus).toBe('APPROVED');
    expect(item?.approvedByUserId).toBe('leader-1');
    expect(item?.approvedAt).not.toBeNull();
    expect(item?.documentPath).not.toBeNull();
    expect(fileStorage.pdfs.size).toBe(1);
    const pdfBuffer = [...fileStorage.pdfs.values()][0];
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF'); // real pdfkit output, Thai font embeds cleanly
  });

  it('isAdmin bypasses the same-school ownership check and signs the PDF as the admin', async () => {
    const { useCase, queueRepo } = setUp();

    await useCase.execute({ queueItemId: 'q1', teamLeaderId: 'admin-1', isAdmin: true });

    const item = await queueRepo.findById('q1');
    expect(item?.approvalStatus).toBe('APPROVED');
    expect(item?.approvedByUserId).toBe('admin-1');
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

  it('approves even when the submitting judge has no signature on file — PDF gets a text note instead (AuditLog covers it)', async () => {
    const { useCase, queueRepo, fileStorage } = setUp({ judgeSignaturePath: null });

    await useCase.execute({ queueItemId: 'q1', teamLeaderId: 'leader-1' });

    expect((await queueRepo.findById('q1'))?.approvalStatus).toBe('APPROVED');
    expect(fileStorage.pdfs.size).toBe(1);
  });

  it('approves even when the team leader has no signature on file — PDF gets a text note instead (AuditLog covers it)', async () => {
    const { useCase, queueRepo, fileStorage } = setUp({ leaderSignaturePath: null });

    await useCase.execute({ queueItemId: 'q1', teamLeaderId: 'leader-1' });

    expect((await queueRepo.findById('q1'))?.approvalStatus).toBe('APPROVED');
    expect(fileStorage.pdfs.size).toBe(1);
  });
});
