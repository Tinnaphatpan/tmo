import request from 'supertest';
import * as http from 'node:http';
import { AddressInfo } from 'node:net';
import { Subject } from 'rxjs';
import * as ExcelJS from 'exceljs';
import { ApiTestApp, createApiTestApp } from '../../testing/api-test-app';
import { FakeQueueRepository, makeQueueItem } from '../../testing/fake-queue.repository';
import { FakeUserAssignmentRepository } from '../../testing/fake-user-assignment.repository';
import { FakeStudentsRepository, makeStudent } from '../../testing/fake-students.repository';
import { FakeScoresRepository } from '../../testing/fake-scores.repository';
import { FakeSettingsRepository } from '../../testing/fake-settings.repository';
import { FakeAuditLogRepository } from '../../testing/fake-audit-log.repository';
import { FakeTransactionRunner } from '../../testing/fake-transaction-runner';
import { FakeScoreEditRequestsRepository } from '../../testing/fake-score-edit-requests.repository';
import { FakeSchoolsRepository } from '../../testing/fake-schools.repository';
import { QueueRepository } from './queue.repository';
import { UserAssignmentRepository } from '../user-assignment/user-assignment.repository';
import { StudentsRepository } from '../students/students.repository';
import { ScoresRepository } from '../scores/scores.repository';
import { SettingsRepository } from '../settings/settings.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { ScoreEditRequestsRepository } from '../scores/score-edit-requests.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { TransactionRunner } from '../../database/transaction-runner';
import { RealtimeService } from '../realtime/realtime.service';
import { QueueController } from './queue.controller';
import { GetPublicQueueUseCase } from './use-cases/get-public-queue.use-case';
import { GetMyQueueUseCase } from './use-cases/get-my-queue.use-case';
import { ClaimQueueItemUseCase } from './use-cases/claim-queue-item.use-case';
import { ReleaseQueueItemUseCase } from './use-cases/release-queue-item.use-case';
import { SkipQueueItemUseCase } from './use-cases/skip-queue-item.use-case';
import { SubmitScoreUseCase } from './use-cases/submit-score.use-case';
import { ScoreEditRequestsController } from '../scores/score-edit-requests.controller';
import { ReviewScoreEditRequestUseCase } from '../scores/use-cases/review-score-edit-request.use-case';
import { ScoreSheetGenerator } from '../approval/score-sheet-generator';
import { FileStorage } from '../../common/file-storage';
import { FakeFileStorage } from '../../testing/fake-file-storage';
import { CreateScoreEditRequestUseCase } from '../scores/use-cases/create-score-edit-request.use-case';
import { TeamLeaderReportController } from '../team-leader/team-leader-report.controller';
import { GetTeamLeaderReportUseCase } from '../team-leader/get-team-leader-report.use-case';

const S1 = '11111111-1111-4111-8111-111111111111';
const S2 = '22222222-2222-4222-8222-222222222222';
const SCORE = '33333333-3333-4333-8333-333333333333';

describe('Queue / scoring / edit-request / export endpoints (HTTP)', () => {
  let api: ApiTestApp;
  let queue: FakeQueueRepository;
  let students: FakeStudentsRepository;
  let scores: FakeScoresRepository;
  let settings: FakeSettingsRepository;
  let assignments: FakeUserAssignmentRepository;
  let editRequests: FakeScoreEditRequestsRepository;
  let audit: FakeAuditLogRepository;
  const changes = new Subject<void>();
  const notifyChange = jest.fn();

  beforeEach(async () => {
    queue = new FakeQueueRepository();
    students = new FakeStudentsRepository();
    scores = new FakeScoresRepository();
    settings = new FakeSettingsRepository();
    assignments = new FakeUserAssignmentRepository();
    editRequests = new FakeScoreEditRequestsRepository(scores);
    audit = new FakeAuditLogRepository();
    const schools = new FakeSchoolsRepository();
    schools.seed({ id: 'school-1', name: 'โรงเรียน A', code: 'A' });
    notifyChange.mockClear();

    api = await createApiTestApp({
      controllers: [QueueController, ScoreEditRequestsController, TeamLeaderReportController],
      providers: [
        { provide: QueueRepository, useValue: queue },
        { provide: StudentsRepository, useValue: students },
        { provide: ScoresRepository, useValue: scores },
        { provide: SettingsRepository, useValue: settings },
        { provide: UserAssignmentRepository, useValue: assignments },
        { provide: ScoreEditRequestsRepository, useValue: editRequests },
        { provide: AuditLogRepository, useValue: audit },
        { provide: SchoolsRepository, useValue: schools },
        { provide: TransactionRunner, useValue: new FakeTransactionRunner() },
        { provide: RealtimeService, useValue: { notifyChange, stream: changes.asObservable() } },
        GetPublicQueueUseCase,
        GetMyQueueUseCase,
        ClaimQueueItemUseCase,
        ReleaseQueueItemUseCase,
        SkipQueueItemUseCase,
        SubmitScoreUseCase,
        CreateScoreEditRequestUseCase,
        ReviewScoreEditRequestUseCase,
        ScoreSheetGenerator,
        { provide: FileStorage, useValue: new FakeFileStorage() },
        GetTeamLeaderReportUseCase,
      ],
    });
  });

  afterEach(() => api.app.close());

  const http_ = () => request(api.app.getHttpServer());

  describe('GET /queue (public board)', () => {
    it('200 with no auth and exposes no judge/score/approval fields', async () => {
      queue.seed(
        makeQueueItem({
          id: 'q1',
          status: 'IN_PROGRESS',
          claimedByUserId: 'secret-judge',
          submittedByUserId: 'secret-submitter',
          approvalStatus: 'PENDING',
          scheduledAt: new Date('2026-01-01T06:30:00Z'),
        }),
      );
      const res = await http_().get('/queue').expect(200);
      expect(res.body.counts).toMatchObject({ inProgress: 1, total: 1 });
      expect(res.body.slots).toHaveLength(1);
      const json = JSON.stringify(res.body);
      for (const leaked of ['secret-judge', 'secret-submitter', 'approvalStatus', 'documentPath']) {
        expect(json).not.toContain(leaked);
      }
    });
  });

  describe('GET /queue/stream (SSE)', () => {
    it('responds text/event-stream, sends `ready` first, then `changed` when the realtime service fires', async () => {
      await api.app.listen(0);
      const { port } = api.app.getHttpServer().address() as AddressInfo;

      const received = await new Promise<string>((resolve, reject) => {
        let buf = '';
        const req = http.get({ port, path: '/queue/stream' }, (res) => {
          expect(res.headers['content-type']).toContain('text/event-stream');
          res.setEncoding('utf8');
          res.on('data', (chunk: string) => {
            buf += chunk;
            if (buf.includes('event: ready') && !buf.includes('event: changed')) changes.next();
            if (buf.includes('event: changed')) {
              req.destroy();
              resolve(buf);
            }
          });
        });
        req.on('error', (e) => {
          if (!buf.includes('event: changed')) reject(e);
        });
        const timer = setTimeout(() => reject(new Error(`SSE timeout, got: ${buf}`)), 4000);
        req.on('close', () => clearTimeout(timer));
      });

      expect(received.indexOf('event: ready')).toBeLessThan(received.indexOf('event: changed'));
    });
  });

  describe('GET /queue/mine', () => {
    it('401 anonymous; 403 for TEAM_LEADER', async () => {
      await http_().get('/queue/mine').expect(401);
      await http_().get('/queue/mine').set('Authorization', api.login({ role: 'TEAM_LEADER' })).expect(403);
    });

    it('ADMIN sees every item, unfiltered by UserAssignment scope', async () => {
      const auth = api.login({ id: 'admin-1', role: 'ADMIN' });
      queue.seed(makeQueueItem({ id: 'a', problemNumber: 1, schoolId: 'school-1' }));
      queue.seed(makeQueueItem({ id: 'b', problemNumber: 4, schoolId: 'school-2' }));

      const res = await http_().get('/queue/mine').set('Authorization', auth).expect(200);
      expect(res.body.items.map((i: { id: string }) => i.id).sort()).toEqual(['a', 'b']);
    });

    it('returns only items in the caller’s problem scope, with the nested roster and approvalStatus', async () => {
      const auth = api.login({ id: 'c1', role: 'COMMITTEE' });
      assignments.seed('c1', [2]);
      students.seed(makeStudent({ id: 'st1', schoolId: 'school-1' }));
      queue.seed(makeQueueItem({ id: 'mine', problemNumber: 2, schoolId: 'school-1' }));
      queue.seed(makeQueueItem({ id: 'other', problemNumber: 3, schoolId: 'school-1' }));

      const res = await http_().get('/queue/mine').set('Authorization', auth).expect(200);
      expect(res.body.problemNumbers).toEqual([2]);
      expect(res.body.items.map((i: { id: string }) => i.id)).toEqual(['mine']);
      expect(res.body.items[0].school.students).toHaveLength(1);
      expect(res.body.items[0].approvalStatus).toBe('NOT_SUBMITTED');
      expect(res.body.scoringLocked).toBe(false);
    });
  });

  describe('POST /queue/:id/score', () => {
    beforeEach(() => {
      students.seed(makeStudent({ id: S1, schoolId: 'school-1', seqNo: 1 }));
      students.seed(makeStudent({ id: S2, schoolId: 'school-1', seqNo: 2, studentCode: '2X' }));
    });
    const held = (by: string) =>
      queue.seed(makeQueueItem({ id: 'q1', schoolId: 'school-1', status: 'IN_PROGRESS', claimedByUserId: by }));
    const full = { scores: [{ studentId: S1, value: 5 }, { studentId: S2, value: 7.5 }] };

    it('401 anonymous; 403 for TEAM_LEADER', async () => {
      await http_().post('/queue/q1/score').send(full).expect(401);
      await http_()
        .post('/queue/q1/score')
        .set('Authorization', api.login({ role: 'TEAM_LEADER' }))
        .send(full)
        .expect(403);
    });

    it('200: saves scores, closes the item as DONE + PENDING (attributed to the caller), writes audit rows, notifies', async () => {
      const auth = api.login({ id: 'staff-1', role: 'STAFF' });
      held('staff-1');
      await http_().post('/queue/q1/score').set('Authorization', auth).send(full).expect(200).expect({ ok: true });

      expect(await queue.findById('q1')).toMatchObject({
        status: 'DONE',
        approvalStatus: 'PENDING',
        submittedByUserId: 'staff-1',
      });
      expect(scores.scores.map((s) => [s.studentId, s.value, s.judgeId])).toEqual([
        [S1, 5, 'staff-1'],
        [S2, 7.5, 'staff-1'],
      ]);
      expect(audit.entries).toHaveLength(2);
      expect(notifyChange).toHaveBeenCalledTimes(1);
    });

    it('400 for an incomplete roster, out-of-range values, empty list and unknown fields', async () => {
      const auth = api.login({ id: 'c1', role: 'COMMITTEE' });
      held('c1');
      const post = (b: object) => http_().post('/queue/q1/score').set('Authorization', auth).send(b);
      await post({ scores: [{ studentId: S1, value: 5 }] }).expect(400); // missing S2
      await post({ scores: [{ studentId: S1, value: 11 }, { studentId: S2, value: 1 }] }).expect(400);
      await post({ scores: [{ studentId: S1, value: -1 }, { studentId: S2, value: 1 }] }).expect(400);
      await post({ scores: [] }).expect(400);
      await post({ scores: [{ studentId: 'x', value: 1 }] }).expect(400);
      await post({ ...full, extra: 1 }).expect(400);
      expect(scores.scores).toHaveLength(0);
      expect(notifyChange).not.toHaveBeenCalled();
    });

    it('rejects a judge who does not hold the item, and everyone once scoring is locked', async () => {
      held('someone-else');
      const res = await http_()
        .post('/queue/q1/score')
        .set('Authorization', api.login({ id: 'c1', role: 'COMMITTEE' }))
        .send(full);
      expect([403, 409]).toContain(res.status);

      queue.items.length = 0;
      held('c1');
      settings.seed({ scoringLocked: true });
      const locked = await http_()
        .post('/queue/q1/score')
        .set('Authorization', api.login({ id: 'c1x', role: 'COMMITTEE' }))
        .send(full);
      expect(locked.status).toBeGreaterThanOrEqual(400);
      expect(scores.scores).toHaveLength(0);
    });

    it('404 for an unknown item', async () => {
      await http_()
        .post('/queue/none/score')
        .set('Authorization', api.login({ role: 'COMMITTEE' }))
        .send(full)
        .expect(404);
    });
  });

  describe('POST /score-edit-requests', () => {
    const seedScore = async (judgeId: string) => {
      scores.scores.push({
        id: SCORE,
        studentId: S1,
        queueItemId: 'q1',
        value: 5,
        judgeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    };

    it('401 anonymous; 403 for ADMIN', async () => {
      const body = { scoreId: SCORE, newValue: 6, reason: 'r' };
      await http_().post('/score-edit-requests').send(body).expect(401);
      for (const role of ['ADMIN'] as const) {
        await http_().post('/score-edit-requests').set('Authorization', api.login({ role })).send(body).expect(403);
      }
    });

    it('201 { id } for the score’s own judge — COMMITTEE and STAFF alike', async () => {
      for (const role of ['COMMITTEE', 'STAFF'] as const) {
        scores.scores.length = 0;
        const id = `${role}-judge`;
        await seedScore(id);
        const res = await http_()
          .post('/score-edit-requests')
          .set('Authorization', api.login({ id, role }))
          .send({ scoreId: SCORE, newValue: 8, reason: 'นับผิด' })
          .expect(201);
        expect(res.body.id).toBeTruthy();
      }
      expect(editRequests.requests.length).toBe(2);
      expect(editRequests.requests[0]).toMatchObject({ oldValue: 5, newValue: 8, status: 'PENDING' });
    });

    it('403 for someone else’s score, 404 for an unknown score', async () => {
      await seedScore('owner');
      await http_()
        .post('/score-edit-requests')
        .set('Authorization', api.login({ id: 'intruder', role: 'COMMITTEE' }))
        .send({ scoreId: SCORE, newValue: 8, reason: 'x' })
        .expect(403);
      await http_()
        .post('/score-edit-requests')
        .set('Authorization', api.login({ role: 'COMMITTEE' }))
        .send({ scoreId: '44444444-4444-4444-8444-444444444444', newValue: 8, reason: 'x' })
        .expect(404);
    });

    it('400 for bad payloads: non-UUID id, value outside 0-10, empty reason, unknown field', async () => {
      const auth = api.login({ role: 'COMMITTEE' });
      const post = (b: object) => http_().post('/score-edit-requests').set('Authorization', auth).send(b);
      await post({ scoreId: 'nope', newValue: 5, reason: 'r' }).expect(400);
      await post({ scoreId: SCORE, newValue: 11, reason: 'r' }).expect(400);
      await post({ scoreId: SCORE, newValue: -1, reason: 'r' }).expect(400);
      await post({ scoreId: SCORE, newValue: 5, reason: '' }).expect(400);
      await post({ scoreId: SCORE, newValue: 5, reason: 'r', status: 'APPROVED' }).expect(400);
    });
  });

  describe('GET /team-leader/export', () => {
    it('403 for other roles; team leader gets an .xlsx of their own school with totals', async () => {
      await http_().get('/team-leader/export').expect(401);
      await http_().get('/team-leader/export').set('Authorization', api.login({ role: 'COMMITTEE' })).expect(403);

      students.seed(makeStudent({ id: 'st1', schoolId: 'school-1', studentCode: '1A', name: 'นักเรียน 1', seqNo: 1 }));
      scores.seedExportRow({
        schoolId: 'school-1',
        schoolName: 'โรงเรียน A',
        schoolCode: 'A',
        studentCode: '1A',
        studentName: 'นักเรียน 1',
        problemNumber: 1,
        value: 6.5,
        judgeDisplayName: 'j',
        judgeUsername: 'j',
        recordedAt: new Date(),
        seqNo: 1,
      });

      const res = await http_()
        .get('/team-leader/export')
        .set('Authorization', api.login({ role: 'TEAM_LEADER', schoolId: 'school-1' }))
        .buffer(true)
        .parse((r, cb) => {
          const chunks: Buffer[] = [];
          r.on('data', (c: Buffer) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .expect(200);

      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain('attachment');
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(res.body as unknown as ArrayBuffer);
      const sheet = wb.worksheets[0];
      expect(sheet.name).toBe('โรงเรียน A');
      expect(sheet.getRow(2).getCell(1).value).toBe('1A');
      expect(sheet.getRow(2).getCell(3).value).toBe(6.5);
      expect(sheet.getRow(2).getCell(8).value).toBe(6.5);
    });
  });
});
