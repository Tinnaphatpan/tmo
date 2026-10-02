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
import { AdminApprovalsController } from './admin-approvals.controller';
import { ApproveScoreSetUseCase } from '../approval/use-cases/approve-score-set.use-case';
import { ScoreSheetGenerator } from '../approval/score-sheet-generator';

// 1x1 PNG — pdfkit needs a real image when embedding signatures.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('AdminApprovalsController (HTTP)', () => {
  let api: ApiTestApp;
  let queueRepo: FakeQueueRepository;
  let fileStorage: FakeFileStorage;

  beforeEach(async () => {
    queueRepo = new FakeQueueRepository();
    fileStorage = new FakeFileStorage();
    const schools = new FakeSchoolsRepository();
    schools.seed({ id: 'school-1', name: 'โรงเรียน A', code: 'A' });
    schools.seed({ id: 'school-2', name: 'โรงเรียน B', code: 'B' });
    const students = new FakeStudentsRepository();
    students.seed(makeStudent({ id: 's1', schoolId: 'school-1', seqNo: 1 }));
    students.seed(makeStudent({ id: 's2', schoolId: 'school-2', seqNo: 1 }));
    fileStorage.signatures.set('/sig/judge.png', PNG);
    fileStorage.signatures.set('/sig/admin.png', PNG);

    api = await createApiTestApp({
      controllers: [AdminApprovalsController],
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
        id: 'q-school-1',
        schoolId: 'school-1',
        problemNumber: 2,
        status: 'DONE',
        approvalStatus: 'PENDING',
        submittedByUserId: 'judge-1',
      }),
    );
    queueRepo.seed(
      makeQueueItem({
        id: 'q-school-2',
        schoolId: 'school-2',
        problemNumber: 3,
        status: 'DONE',
        approvalStatus: 'PENDING',
        submittedByUserId: 'judge-1',
      }),
    );
  });

  afterEach(() => api.app.close());

  const http = () => request(api.app.getHttpServer());
  const admin = (over = {}) =>
    api.login({ id: 'admin-1', role: 'ADMIN', schoolId: null, signaturePath: '/sig/admin.png', ...over });

  it('401 anonymous; 403 for every non-ADMIN role on all three routes', async () => {
    await http().get('/admin/approvals').expect(401);
    for (const role of ['COMMITTEE', 'STAFF', 'TEAM_LEADER'] as const) {
      const auth = api.login({ role, schoolId: 'school-1' });
      await http().get('/admin/approvals').set('Authorization', auth).expect(403);
      await http().post('/admin/approvals/q-school-1/approve').set('Authorization', auth).expect(403);
      await http().get('/admin/approvals/q-school-1/document').set('Authorization', auth).expect(403);
    }
  });

  it('GET lists every school’s pending items, not just one', async () => {
    const res = await http().get('/admin/approvals').set('Authorization', admin()).expect(200);
    expect(res.body.map((i: { id: string }) => i.id).sort()).toEqual(['q-school-1', 'q-school-2']);
  });

  it('approve: works across schools (no IDOR-style ownership check for ADMIN)', async () => {
    await http()
      .post('/admin/approvals/q-school-2/approve')
      .set('Authorization', admin())
      .expect(201);
    const item = await queueRepo.findById('q-school-2');
    expect(item).toMatchObject({ approvalStatus: 'APPROVED', approvedByUserId: 'admin-1' });
    expect(item?.documentPath).toBeTruthy();
  });

  it('approve: succeeds even when the admin has no signature uploaded — PDF gets a text note instead', async () => {
    const auth = admin({ signaturePath: null });
    await http().post('/admin/approvals/q-school-1/approve').set('Authorization', auth).expect(201);
    expect((await queueRepo.findById('q-school-1'))?.approvalStatus).toBe('APPROVED');
  });

  it('approve: 404 unknown item', async () => {
    await http().post('/admin/approvals/nope/approve').set('Authorization', admin()).expect(404);
  });

  it('document: 404 before approval has produced a PDF', async () => {
    await http()
      .get('/admin/approvals/q-school-1/document')
      .set('Authorization', admin())
      .expect(404);
  });
});
