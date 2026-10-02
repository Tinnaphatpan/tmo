import request from 'supertest';
import { ApiTestApp, createApiTestApp } from '../../testing/api-test-app';
import { FakeQueueRepository, makeQueueItem } from '../../testing/fake-queue.repository';
import { FakeSchoolsRepository } from '../../testing/fake-schools.repository';
import { FakeStudentsRepository, makeStudent } from '../../testing/fake-students.repository';
import { FakeScoresRepository } from '../../testing/fake-scores.repository';
import { FakeTransactionRunner } from '../../testing/fake-transaction-runner';
import { FakeFileStorage } from '../../testing/fake-file-storage';
import { QueueRepository } from '../queue/queue.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { StudentsRepository } from '../students/students.repository';
import { ScoresRepository } from '../scores/scores.repository';
import { TransactionRunner } from '../../database/transaction-runner';
import { FileStorage } from '../../common/file-storage';
import { ApprovalController } from './approval.controller';
import { ApproveScoreSetUseCase } from './use-cases/approve-score-set.use-case';
import { ScoreSheetGenerator } from './score-sheet-generator';

// 1x1 PNG — pdfkit needs a real image when embedding signatures.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('ApprovalController (HTTP)', () => {
  let api: ApiTestApp;
  let queueRepo: FakeQueueRepository;
  let fileStorage: FakeFileStorage;

  beforeEach(async () => {
    queueRepo = new FakeQueueRepository();
    fileStorage = new FakeFileStorage();
    const schools = new FakeSchoolsRepository();
    schools.seed({ id: 'school-1', name: 'โรงเรียน A', code: 'A' });
    const students = new FakeStudentsRepository();
    students.seed(makeStudent({ id: 's1', schoolId: 'school-1', seqNo: 1 }));
    fileStorage.signatures.set('/sig/judge.png', PNG);
    fileStorage.signatures.set('/sig/leader.png', PNG);

    api = await createApiTestApp({
      controllers: [ApprovalController],
      providers: [
        { provide: QueueRepository, useValue: queueRepo },
        { provide: SchoolsRepository, useValue: schools },
        { provide: StudentsRepository, useValue: students },
        { provide: ScoresRepository, useValue: new FakeScoresRepository() },
        { provide: TransactionRunner, useValue: new FakeTransactionRunner() },
        { provide: FileStorage, useValue: fileStorage },
        ScoreSheetGenerator,
        ApproveScoreSetUseCase,
      ],
    });

    api.usersRepo.seed({
      id: 'judge-1',
      username: 'judge',
      displayName: 'Judge',
      passwordHash: 'x',
      role: 'COMMITTEE',
      schoolId: null,
      signaturePath: '/sig/judge.png',
    });
    queueRepo.seed(
      makeQueueItem({
        id: 'q-pending',
        schoolId: 'school-1',
        problemNumber: 2,
        status: 'DONE',
        approvalStatus: 'PENDING',
        submittedByUserId: 'judge-1',
      }),
    );
    queueRepo.seed(
      makeQueueItem({
        id: 'q-other-school',
        schoolId: 'school-2',
        status: 'DONE',
        approvalStatus: 'PENDING',
        submittedByUserId: 'judge-1',
      }),
    );
  });

  afterEach(() => api.app.close());

  const http = () => request(api.app.getHttpServer());
  const leader = (over = {}) =>
    api.login({
      id: 'leader-1',
      role: 'TEAM_LEADER',
      schoolId: 'school-1',
      signaturePath: '/sig/leader.png',
      ...over,
    });

  it('401 anonymous; 403 for every non-TEAM_LEADER role on all three routes', async () => {
    await http().get('/team-leader/approvals').expect(401);
    for (const role of ['ADMIN', 'COMMITTEE', 'STAFF'] as const) {
      const auth = api.login({ role });
      await http().get('/team-leader/approvals').set('Authorization', auth).expect(403);
      await http().post('/team-leader/approvals/q-pending/approve').set('Authorization', auth).expect(403);
      await http().get('/team-leader/approvals/q-pending/document').set('Authorization', auth).expect(403);
    }
  });

  it('GET lists only the leader’s own school’s pending items', async () => {
    const res = await http().get('/team-leader/approvals').set('Authorization', leader()).expect(200);
    expect(res.body.map((i: { id: string }) => i.id)).toEqual(['q-pending']);
  });

  it('approve: 403 on another school’s item (IDOR guard); item stays PENDING', async () => {
    await http()
      .post('/team-leader/approvals/q-other-school/approve')
      .set('Authorization', leader())
      .expect(403);
    expect((await queueRepo.findById('q-other-school'))?.approvalStatus).toBe('PENDING');
  });

  it('approve: succeeds even with no signature on file — PDF gets a text note instead (AuditLog covers it)', async () => {
    const auth = leader({ signaturePath: null });
    await http().post('/team-leader/approvals/q-pending/approve').set('Authorization', auth).expect(201);
    expect((await queueRepo.findById('q-pending'))?.approvalStatus).toBe('APPROVED');
  });

  it('approve: 404 unknown item', async () => {
    await http().post('/team-leader/approvals/nope/approve').set('Authorization', leader()).expect(404);
  });

  it('approve -> APPROVED with a stored PDF, then document downloads as application/pdf; second approve is 409', async () => {
    const auth = leader();
    await http().post('/team-leader/approvals/q-pending/approve').set('Authorization', auth).expect(201);

    const item = await queueRepo.findById('q-pending');
    expect(item).toMatchObject({ approvalStatus: 'APPROVED', approvedByUserId: 'leader-1' });
    expect(item?.documentPath).toBeTruthy();
    expect(fileStorage.pdfs.size).toBe(1);

    const doc = await http()
      .get('/team-leader/approvals/q-pending/document')
      .set('Authorization', auth)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(doc.headers['content-type']).toContain('application/pdf');
    expect((doc.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');

    await http().post('/team-leader/approvals/q-pending/approve').set('Authorization', auth).expect(409);
  });

  it('document: 403 for another school, 404 before approval has produced a PDF', async () => {
    await http()
      .get('/team-leader/approvals/q-other-school/document')
      .set('Authorization', leader())
      .expect(403);
    await http()
      .get('/team-leader/approvals/q-pending/document')
      .set('Authorization', leader())
      .expect(404);
  });
});
