import request from 'supertest';
import { EMPTY } from 'rxjs';
import { ApiTestApp, createApiTestApp } from '../../testing/api-test-app';
import { FakeScoresRepository } from '../../testing/fake-scores.repository';
import { FakeScoreEditRequestsRepository } from '../../testing/fake-score-edit-requests.repository';
import { FakeQueueRepository, makeQueueItem } from '../../testing/fake-queue.repository';
import { FakeSchoolsRepository } from '../../testing/fake-schools.repository';
import { FakeStudentsRepository, makeStudent } from '../../testing/fake-students.repository';
import { FakeAuditLogRepository } from '../../testing/fake-audit-log.repository';
import { FakeTransactionRunner } from '../../testing/fake-transaction-runner';
import { FakeFileStorage } from '../../testing/fake-file-storage';
import { ScoresRepository } from '../scores/scores.repository';
import { ScoreEditRequestsRepository } from '../scores/score-edit-requests.repository';
import { QueueRepository } from '../queue/queue.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { StudentsRepository } from '../students/students.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { TransactionRunner } from '../../database/transaction-runner';
import { FileStorage } from '../../common/file-storage';
import { RealtimeService } from '../realtime/realtime.service';
import { ScoreSheetGenerator } from '../approval/score-sheet-generator';
import { ReviewScoreEditRequestUseCase } from '../scores/use-cases/review-score-edit-request.use-case';
import { TeamLeaderScoreEditRequestsController } from './team-leader-score-edit-requests.controller';
import { TeamLeaderReportController } from './team-leader-report.controller';
import { GetTeamLeaderReportUseCase } from './get-team-leader-report.use-case';

describe('Team leader controllers (HTTP)', () => {
  let api: ApiTestApp;
  let scoresRepo: FakeScoresRepository;
  let editRepo: FakeScoreEditRequestsRepository;
  const notifyChange = jest.fn();

  beforeEach(async () => {
    scoresRepo = new FakeScoresRepository();
    editRepo = new FakeScoreEditRequestsRepository();
    const queueRepo = new FakeQueueRepository();
    queueRepo.seed(makeQueueItem({ id: 'q1', schoolId: 'school-1' }));
    const schools = new FakeSchoolsRepository();
    schools.seed({ id: 'school-1', name: 'โรงเรียน A', code: 'A' });
    const students = new FakeStudentsRepository();
    students.seed(makeStudent({ id: 's1', schoolId: 'school-1', seqNo: 1 }));
    notifyChange.mockClear();

    api = await createApiTestApp({
      controllers: [TeamLeaderScoreEditRequestsController, TeamLeaderReportController],
      providers: [
        { provide: ScoresRepository, useValue: scoresRepo },
        { provide: ScoreEditRequestsRepository, useValue: editRepo },
        { provide: QueueRepository, useValue: queueRepo },
        { provide: SchoolsRepository, useValue: schools },
        { provide: StudentsRepository, useValue: students },
        { provide: AuditLogRepository, useValue: new FakeAuditLogRepository() },
        { provide: TransactionRunner, useValue: new FakeTransactionRunner() },
        { provide: FileStorage, useValue: new FakeFileStorage() },
        { provide: RealtimeService, useValue: { notifyChange, stream: EMPTY } },
        ScoreSheetGenerator,
        ReviewScoreEditRequestUseCase,
        GetTeamLeaderReportUseCase,
      ],
    });
  });

  afterEach(() => api.app.close());

  const http = () => request(api.app.getHttpServer());
  const leader = (schoolId = 'school-1') =>
    api.login({ id: `leader-${schoolId}`, role: 'TEAM_LEADER', schoolId });

  async function seedPendingRequest() {
    const { score } = await scoresRepo.upsertOne(
      { studentId: 's1', queueItemId: 'q1', value: 5, judgeId: 'judge-1' },
    );
    return editRepo.create({
      scoreId: score.id,
      requestedBy: 'judge-1',
      oldValue: 5,
      newValue: 8,
      reason: 'นับขั้นตอนไม่ครบ',
    });
  }

  describe('/team-leader/score-edit-requests', () => {
    it('401 anonymous; 403 for ADMIN (moved off admin in B3), COMMITTEE, STAFF', async () => {
      await http().get('/team-leader/score-edit-requests').expect(401);
      for (const role of ['ADMIN', 'COMMITTEE', 'STAFF'] as const) {
        await http()
          .get('/team-leader/score-edit-requests')
          .set('Authorization', api.login({ role }))
          .expect(403);
      }
    });

    it('GET 200 for a team leader', async () => {
      await seedPendingRequest();
      const res = await http()
        .get('/team-leader/score-edit-requests')
        .set('Authorization', leader())
        .expect(200);
      expect(res.body).toHaveLength(1);
    });

    it('PATCH 400 for an invalid action', async () => {
      const req = await seedPendingRequest();
      await http()
        .patch(`/team-leader/score-edit-requests/${req.id}`)
        .set('Authorization', leader())
        .send({ action: 'maybe' })
        .expect(400);
    });

    it('PATCH approve by the owning school’s leader: 200, score updated, clients notified', async () => {
      const req = await seedPendingRequest();
      await http()
        .patch(`/team-leader/score-edit-requests/${req.id}`)
        .set('Authorization', leader('school-1'))
        .send({ action: 'approve' })
        .expect(200)
        .expect({ ok: true });
      expect((await editRepo.findById(req.id))?.status).toBe('APPROVED');
      expect(notifyChange).toHaveBeenCalledTimes(1);
    });

    it('PATCH by a leader from a different school: 403, request stays PENDING, no notify', async () => {
      const req = await seedPendingRequest();
      await http()
        .patch(`/team-leader/score-edit-requests/${req.id}`)
        .set('Authorization', leader('school-2'))
        .send({ action: 'approve' })
        .expect(403);
      expect((await editRepo.findById(req.id))?.status).toBe('PENDING');
      expect(notifyChange).not.toHaveBeenCalled();
    });

    it('PATCH reject: 200, request REJECTED', async () => {
      const req = await seedPendingRequest();
      await http()
        .patch(`/team-leader/score-edit-requests/${req.id}`)
        .set('Authorization', leader())
        .send({ action: 'reject' })
        .expect(200);
      expect((await editRepo.findById(req.id))?.status).toBe('REJECTED');
    });
  });

  describe('GET /team-leader/report', () => {
    it('403 for non-team-leaders; 200 with the leader’s own school roster', async () => {
      await http()
        .get('/team-leader/report')
        .set('Authorization', api.login({ role: 'COMMITTEE' }))
        .expect(403);
      const res = await http().get('/team-leader/report').set('Authorization', leader()).expect(200);
      expect(res.body.schoolName).toBe('โรงเรียน A');
      expect(res.body.rows).toHaveLength(1);
    });
  });
});
