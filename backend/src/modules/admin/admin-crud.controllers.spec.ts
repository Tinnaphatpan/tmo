import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { EMPTY } from 'rxjs';
import { ApiTestApp, createApiTestApp } from '../../testing/api-test-app';
import { makeUser } from '../../testing/fake-users.repository';
import { FakeUserAssignmentRepository } from '../../testing/fake-user-assignment.repository';
import { FakeSchoolsRepository } from '../../testing/fake-schools.repository';
import { FakeStudentsRepository, makeStudent } from '../../testing/fake-students.repository';
import { FakeQueueRepository, makeQueueItem } from '../../testing/fake-queue.repository';
import { FakeScoresRepository } from '../../testing/fake-scores.repository';
import { FakeAuditLogRepository } from '../../testing/fake-audit-log.repository';
import { FakeSettingsRepository } from '../../testing/fake-settings.repository';
import { FakeScoreEditRequestsRepository } from '../../testing/fake-score-edit-requests.repository';
import { UserAssignmentRepository } from '../user-assignment/user-assignment.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { StudentsRepository } from '../students/students.repository';
import { QueueRepository } from '../queue/queue.repository';
import { ScoresRepository } from '../scores/scores.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { SettingsRepository } from '../settings/settings.repository';
import { ScoreEditRequestsRepository } from '../scores/score-edit-requests.repository';
import { RealtimeService } from '../realtime/realtime.service';
import { AdminCommitteeController } from './admin-committee.controller';
import { AdminSchoolsController } from './admin-schools.controller';
import { AdminQueueController } from './admin-queue.controller';
import { AdminStudentsController } from './admin-students.controller';
import { AdminScoresController } from './admin-scores.controller';
import { AdminAuditLogController } from './admin-audit-log.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { ManageCommitteeUseCase } from './use-cases/manage-committee.use-case';
import { ListCommitteeUseCase } from './use-cases/list-committee.use-case';
import { ManageSchoolsUseCase } from './use-cases/manage-schools.use-case';
import { ManageQueueUseCase } from './use-cases/manage-queue.use-case';
import { GetDashboardUseCase } from './use-cases/get-dashboard.use-case';
import { StudentImportUseCase } from './student-import/student-import.use-case';
import { GenerateQueueScheduleUseCase } from './use-cases/generate-queue-schedule.use-case';
import { FakeTransactionRunner } from '../../testing/fake-transaction-runner';
import { TransactionRunner } from '../../database/transaction-runner';

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;

describe('Remaining ADMIN controllers (HTTP)', () => {
  let api: ApiTestApp;
  let schools: FakeSchoolsRepository;
  let students: FakeStudentsRepository;
  let queue: FakeQueueRepository;
  let scores: FakeScoresRepository;
  let audit: FakeAuditLogRepository;
  let settings: FakeSettingsRepository;
  let assignments: FakeUserAssignmentRepository;
  const notifyChange = jest.fn();

  beforeEach(async () => {
    schools = new FakeSchoolsRepository();
    students = new FakeStudentsRepository();
    queue = new FakeQueueRepository();
    scores = new FakeScoresRepository();
    audit = new FakeAuditLogRepository();
    settings = new FakeSettingsRepository();
    assignments = new FakeUserAssignmentRepository();
    notifyChange.mockClear();
    api = await createApiTestApp({
      controllers: [
        AdminCommitteeController,
        AdminSchoolsController,
        AdminQueueController,
        AdminStudentsController,
        AdminScoresController,
        AdminAuditLogController,
        AdminDashboardController,
        AdminSettingsController,
      ],
      providers: [
        { provide: SchoolsRepository, useValue: schools },
        { provide: StudentsRepository, useValue: students },
        { provide: QueueRepository, useValue: queue },
        { provide: ScoresRepository, useValue: scores },
        { provide: AuditLogRepository, useValue: audit },
        { provide: SettingsRepository, useValue: settings },
        { provide: UserAssignmentRepository, useValue: assignments },
        { provide: ScoreEditRequestsRepository, useValue: new FakeScoreEditRequestsRepository() },
        { provide: RealtimeService, useValue: { notifyChange, stream: EMPTY } },
        { provide: ConfigService, useValue: { get: () => 4 } },
        ManageCommitteeUseCase,
        ListCommitteeUseCase,
        ManageSchoolsUseCase,
        ManageQueueUseCase,
        GetDashboardUseCase,
        StudentImportUseCase,
        GenerateQueueScheduleUseCase,
        { provide: TransactionRunner, useValue: new FakeTransactionRunner() },
      ],
    });
  });

  afterEach(() => api.app.close());

  const http = () => request(api.app.getHttpServer());
  const admin = () => api.login({ role: 'ADMIN' });

  /** Every route below is ADMIN-only: 401 anonymous, 403 for each other role. */
  const ROUTES: Array<[string, string]> = [
    ['get', '/admin/committee'],
    ['post', '/admin/committee'],
    ['patch', '/admin/committee'],
    ['delete', '/admin/committee'],
    ['get', '/admin/schools'],
    ['post', '/admin/schools'],
    ['patch', '/admin/schools'],
    ['delete', '/admin/schools'],
    ['get', '/admin/queue'],
    ['post', '/admin/queue'],
    ['patch', '/admin/queue'],
    ['delete', '/admin/queue'],
    ['post', '/admin/queue/generate'],
    ['get', '/admin/students'],
    ['post', '/admin/students/import'],
    ['delete', '/admin/students'],
    ['get', '/admin/scores'],
    ['get', '/admin/scores/export'],
    ['get', '/admin/audit-log'],
    ['get', '/admin/dashboard'],
    ['patch', '/admin/settings/lock'],
  ];

  it.each(ROUTES)('%s %s: 401 anonymous, 403 for COMMITTEE / STAFF / TEAM_LEADER', async (method, path) => {
    const call = (auth?: string) => {
      const r = (http() as unknown as Record<string, (p: string) => request.Test>)[method](path);
      return auth ? r.set('Authorization', auth) : r;
    };
    await call().expect(401);
    for (const role of ['COMMITTEE', 'STAFF', 'TEAM_LEADER'] as const) {
      await call(api.login({ role })).expect(403);
    }
  });

  describe('/admin/committee', () => {
    const body = (over: object = {}) => ({
      username: 'com-new',
      displayName: 'Com New',
      password: 'password123',
      problemNumbers: [1, 2],
      ...over,
    });

    it('POST creates, GET lists with problemNumbers, no hash leaked', async () => {
      const created = await http().post('/admin/committee').set('Authorization', admin()).send(body()).expect(201);
      expect(created.body.user.username).toBe('com-new');
      const list = await http().get('/admin/committee').set('Authorization', admin()).expect(200);
      expect(list.body).toEqual([
        expect.objectContaining({ username: 'com-new', problemNumbers: [1, 2] }),
      ]);
      expect(JSON.stringify(list.body)).not.toContain('passwordHash');
    });

    it('POST 400 on: short password, empty/out-of-range problems, unknown field', async () => {
      const post = (b: object) => http().post('/admin/committee').set('Authorization', admin()).send(b);
      await post(body({ password: 'short' })).expect(400);
      await post(body({ problemNumbers: [] })).expect(400);
      await post(body({ problemNumbers: [6] })).expect(400);
      await post(body({ problemNumbers: [0] })).expect(400);
      await post(body({ role: 'ADMIN' })).expect(400);
    });

    it('PATCH replaces problems; 400 on a non-UUID id', async () => {
      api.usersRepo.seed(makeUser({ id: U(1), role: 'COMMITTEE' }));
      await http()
        .patch('/admin/committee')
        .set('Authorization', admin())
        .send({ id: U(1), problemNumbers: [4, 5] })
        .expect(200);
      expect((await assignments.findProblemNumbersByUser(U(1))).sort()).toEqual([4, 5]);
      await http().patch('/admin/committee').set('Authorization', admin()).send({ id: 'nope' }).expect(400);
    });

    it('DELETE: 200 for committee, 403 for an admin account, 404 for unknown', async () => {
      api.usersRepo.seed(makeUser({ id: 'c', role: 'COMMITTEE' }));
      api.usersRepo.seed(makeUser({ id: 'a2', role: 'ADMIN' }));
      await http().delete('/admin/committee').query({ id: 'c' }).set('Authorization', admin()).expect(200);
      await http().delete('/admin/committee').query({ id: 'a2' }).set('Authorization', admin()).expect(403);
      await http().delete('/admin/committee').query({ id: 'zzz' }).set('Authorization', admin()).expect(404);
    });
  });

  describe('/admin/schools', () => {
    it('POST creates ({ school }), GET lists, PATCH renames, DELETE removes', async () => {
      const created = await http()
        .post('/admin/schools')
        .set('Authorization', admin())
        .send({ name: 'School A', code: 'A' })
        .expect(201);
      const id = created.body.school.id;
      expect(created.body.school).toMatchObject({ name: 'School A', code: 'A' });

      expect((await http().get('/admin/schools').set('Authorization', admin()).expect(200)).body).toHaveLength(1);

      await http().patch('/admin/schools').set('Authorization', admin()).send({ id: U(2), name: 'x' }).expect(404);
      await http().patch('/admin/schools').set('Authorization', admin()).send({ id: 'not-a-uuid', name: 'x' }).expect(400);

      schools.schools[0].id = U(3);
      const renamed = await http()
        .patch('/admin/schools')
        .set('Authorization', admin())
        .send({ id: U(3), name: 'School B' })
        .expect(200);
      expect(renamed.body.school).toMatchObject({ name: 'School B', code: null });
      expect(id).toBeTruthy();

      await http().delete('/admin/schools').query({ id: U(3) }).set('Authorization', admin()).expect(200);
      expect(schools.schools).toHaveLength(0);
    });

    it('POST 400 for a missing/empty name or unknown field', async () => {
      const post = (b: object) => http().post('/admin/schools').set('Authorization', admin()).send(b);
      await post({}).expect(400);
      await post({ name: '' }).expect(400);
      await post({ name: 'x', extra: 1 }).expect(400);
    });

    it('DELETE 409 when the school still has queue items', async () => {
      schools.seed({ id: 's1', name: 'A', code: null });
      jest.spyOn(schools, 'hasQueueItems').mockResolvedValueOnce(true);
      await http().delete('/admin/schools').query({ id: 's1' }).set('Authorization', admin()).expect(409);
      expect(schools.schools).toHaveLength(1);
    });
  });

  describe('/admin/queue', () => {
    it('GET lists all items with school info', async () => {
      queue.seed(makeQueueItem({ id: 'q1' }));
      const res = await http().get('/admin/queue').set('Authorization', admin()).expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ id: 'q1', schoolName: expect.any(String) });
    });

    it('POST creates an item at the end of the problem; 409 for a duplicate; 400 for bad input', async () => {
      queue.seed(makeQueueItem({ id: 'q1', schoolId: U(4), problemNumber: 2, position: 0 }));
      const ok = await http()
        .post('/admin/queue')
        .set('Authorization', admin())
        .send({ schoolId: U(5), problemNumber: 2 })
        .expect(201);
      expect(ok.body.item).toMatchObject({ problemNumber: 2, position: 1, status: 'WAITING' });

      await http().post('/admin/queue').set('Authorization', admin()).send({ schoolId: U(5), problemNumber: 2 }).expect(409);
      await http().post('/admin/queue').set('Authorization', admin()).send({ schoolId: 'x', problemNumber: 2 }).expect(400);
      await http().post('/admin/queue').set('Authorization', admin()).send({ schoolId: U(6), problemNumber: 9 }).expect(400);
    });

    it('PATCH moves up/down (200); 400 for a bad direction; 404 for an unknown item', async () => {
      queue.seed(makeQueueItem({ id: U(7), schoolId: 's1', problemNumber: 1, position: 0 }));
      queue.seed(makeQueueItem({ id: U(8), schoolId: 's2', problemNumber: 1, position: 1 }));
      await http().patch('/admin/queue').set('Authorization', admin()).send({ id: U(7), direction: 'down' }).expect(200);
      expect((await queue.findById(U(7)))?.position).toBe(1);
      expect((await queue.findById(U(8)))?.position).toBe(0);
      await http().patch('/admin/queue').set('Authorization', admin()).send({ id: U(7), direction: 'left' }).expect(400);
      await http().patch('/admin/queue').set('Authorization', admin()).send({ id: U(9), direction: 'up' }).expect(404);
    });

    it('DELETE removes the item', async () => {
      queue.seed(makeQueueItem({ id: 'q1' }));
      await http().delete('/admin/queue').query({ id: 'q1' }).set('Authorization', admin()).expect(200).expect({ ok: true });
      expect(await queue.findById('q1')).toBeNull();
    });
  });

  describe('/admin/students', () => {
    beforeEach(() => {
      schools.seed({ id: 'school-1', name: 'KMUTNB', code: 'KMUTNB' });
    });
    const csv = (rows: string) => Buffer.from(`schoolCode,seqNo,name\n${rows}\n`);

    it('GET lists students across schools', async () => {
      students.seed(makeStudent({ id: 'st1', schoolId: 'school-1' }));
      const res = await http().get('/admin/students').set('Authorization', admin()).expect(200);
      expect(res.body).toHaveLength(1);
    });

    it('POST /import defaults to preview (nothing written) and mode=commit writes', async () => {
      const preview = await http()
        .post('/admin/students/import')
        .set('Authorization', admin())
        .attach('file', csv('KMUTNB,1,เด็กชาย ก\nNOPE,2,เด็กชาย ข'), 'a.csv')
        .expect(201);
      expect(preview.body).toMatchObject({ validCount: 1, errorCount: 1 });
      expect(students.students).toHaveLength(0);

      const commit = await http()
        .post('/admin/students/import')
        .set('Authorization', admin())
        .field('mode', 'commit')
        .attach('file', csv('KMUTNB,1,เด็กชาย ก'), 'a.csv')
        .expect(201);
      expect(commit.body).toEqual({ imported: 1 });
      expect(students.students).toHaveLength(1);
    });

    it('POST /import: 400 without a file; 400 committing a file with no valid rows', async () => {
      await http().post('/admin/students/import').set('Authorization', admin()).expect(400);
      await http()
        .post('/admin/students/import')
        .set('Authorization', admin())
        .field('mode', 'commit')
        .attach('file', csv('NOPE,1,x'), 'a.csv')
        .expect(400);
    });

    it('DELETE removes a student', async () => {
      students.seed(makeStudent({ id: 'st1' }));
      await http().delete('/admin/students').query({ id: 'st1' }).set('Authorization', admin()).expect(200);
      expect(await students.findById('st1')).toBeNull();
    });
  });

  describe('/admin/scores', () => {
    const row = {
      schoolId: 's1',
      schoolName: 'A School',
      schoolCode: 'A',
      studentCode: '1A',
      studentName: 'นักเรียน',
      problemNumber: 2,
      value: 7.5,
      judgeDisplayName: 'กรรมการ 1',
      judgeUsername: 'committee1',
      recordedAt: new Date('2026-01-01T00:00:00Z'),
      seqNo: 1,
    };

    it('GET lists rows; GET /export is a CSV attachment with header + formatted values', async () => {
      scores.seedExportRow(row);
      const list = await http().get('/admin/scores').set('Authorization', admin()).expect(200);
      expect(list.body).toHaveLength(1);

      const csv = await http().get('/admin/scores/export').set('Authorization', admin()).expect(200);
      expect(csv.headers['content-type']).toContain('text/csv');
      expect(csv.headers['content-disposition']).toMatch(/attachment; filename="tmo-scores-\d{4}-\d{2}-\d{2}\.csv"/);
      const lines = csv.text.replace(/^﻿/, '').trim().split(/\r?\n/);
      expect(lines[0]).toContain('โรงเรียน');
      expect(lines[1]).toContain('7.50');
      expect(lines[1]).toContain('committee1');
    });
  });

  describe('/admin/audit-log and /admin/dashboard', () => {
    it('audit-log returns entries with the performer’s display name', async () => {
      await audit.create(
        { action: 'SCORE_CREATED', entityType: 'Score', entityId: 'x', oldValue: null, newValue: '5.00', performedBy: 'u' },
        undefined as never,
      );
      const res = await http().get('/admin/audit-log').set('Authorization', admin()).expect(200);
      expect(res.body).toEqual([expect.objectContaining({ action: 'SCORE_CREATED', performedByDisplayName: 'x' })]);
    });

    it('dashboard aggregates counts and the lock state', async () => {
      schools.seed({ id: 's1', name: 'A', code: 'A' });
      queue.seed(makeQueueItem({ id: 'q1', schoolId: 's1', status: 'DONE' }));
      settings.seed({ scoringLocked: true });
      const res = await http().get('/admin/dashboard').set('Authorization', admin()).expect(200);
      expect(res.body).toMatchObject({
        schoolCount: 1,
        schoolsFullyScored: 1,
        scoringLocked: true,
        queueCounts: { done: 1, total: 1 },
      });
    });
  });

  describe('PATCH /admin/settings/lock', () => {
    it('locks/unlocks, records who, and notifies realtime clients', async () => {
      const auth = api.login({ id: 'admin-1', role: 'ADMIN' });
      const locked = await http().patch('/admin/settings/lock').set('Authorization', auth).send({ locked: true }).expect(200);
      expect(locked.body).toEqual({ scoringLocked: true });
      expect((await settings.get()).lockedBy).toBe('admin-1');

      const unlocked = await http().patch('/admin/settings/lock').set('Authorization', auth).send({ locked: false }).expect(200);
      expect(unlocked.body).toEqual({ scoringLocked: false });
      expect(notifyChange).toHaveBeenCalledTimes(2);
    });

    it('400 for a non-boolean or missing value', async () => {
      await http().patch('/admin/settings/lock').set('Authorization', admin()).send({ locked: 'yes' }).expect(400);
      await http().patch('/admin/settings/lock').set('Authorization', admin()).send({}).expect(400);
      expect(notifyChange).not.toHaveBeenCalled();
    });
  });
});
