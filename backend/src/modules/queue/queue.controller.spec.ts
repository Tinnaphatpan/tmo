import request from 'supertest';
import { EMPTY } from 'rxjs';
import { ApiTestApp, createApiTestApp } from '../../testing/api-test-app';
import { FakeQueueRepository, makeQueueItem } from '../../testing/fake-queue.repository';
import { FakeUserAssignmentRepository } from '../../testing/fake-user-assignment.repository';
import { QueueRepository } from './queue.repository';
import { UserAssignmentRepository } from '../user-assignment/user-assignment.repository';
import { RealtimeService } from '../realtime/realtime.service';
import { QueueController } from './queue.controller';
import { GetPublicQueueUseCase } from './use-cases/get-public-queue.use-case';
import { GetMyQueueUseCase } from './use-cases/get-my-queue.use-case';
import { ClaimQueueItemUseCase } from './use-cases/claim-queue-item.use-case';
import { ReleaseQueueItemUseCase } from './use-cases/release-queue-item.use-case';
import { SkipQueueItemUseCase } from './use-cases/skip-queue-item.use-case';
import { SubmitScoreUseCase } from './use-cases/submit-score.use-case';

describe('QueueController (HTTP)', () => {
  let api: ApiTestApp;
  let queueRepo: FakeQueueRepository;
  let assignmentRepo: FakeUserAssignmentRepository;
  const notifyChange = jest.fn();

  beforeEach(async () => {
    queueRepo = new FakeQueueRepository();
    assignmentRepo = new FakeUserAssignmentRepository();
    notifyChange.mockClear();
    api = await createApiTestApp({
      controllers: [QueueController],
      providers: [
        { provide: QueueRepository, useValue: queueRepo },
        { provide: UserAssignmentRepository, useValue: assignmentRepo },
        { provide: RealtimeService, useValue: { notifyChange, stream: EMPTY } },
        { provide: GetPublicQueueUseCase, useValue: {} },
        { provide: GetMyQueueUseCase, useValue: {} },
        { provide: SubmitScoreUseCase, useValue: {} },
        ClaimQueueItemUseCase,
        ReleaseQueueItemUseCase,
        SkipQueueItemUseCase,
      ],
    });
  });

  afterEach(() => api.app.close());

  const http = () => request(api.app.getHttpServer());

  describe('POST /queue/:id/skip', () => {
    it('401 without a token', async () => {
      await http().post('/queue/q1/skip').expect(401);
    });

    it('403 for ADMIN and TEAM_LEADER (not examiner roles)', async () => {
      for (const role of ['ADMIN', 'TEAM_LEADER'] as const) {
        await http().post('/queue/q1/skip').set('Authorization', api.login({ role })).expect(403);
      }
    });

    it('200: STAFF skips the item they hold -> WAITING at the end of the problem queue', async () => {
      const auth = api.login({ id: 'staff-1', role: 'STAFF' });
      queueRepo.seed(
        makeQueueItem({
          id: 'q1',
          problemNumber: 2,
          position: 0,
          status: 'IN_PROGRESS',
          claimedByUserId: 'staff-1',
        }),
      );
      queueRepo.seed(makeQueueItem({ id: 'q2', problemNumber: 2, position: 4, schoolId: 's2' }));

      await http().post('/queue/q1/skip').set('Authorization', auth).expect(200).expect({ ok: true });

      const item = await queueRepo.findById('q1');
      expect(item).toMatchObject({ status: 'WAITING', claimedByUserId: null, position: 5 });
      expect(notifyChange).toHaveBeenCalledTimes(1);
    });

    it('409 with an { error } body when the caller does not hold the item', async () => {
      const auth = api.login({ id: 'staff-1', role: 'STAFF' });
      queueRepo.seed(makeQueueItem({ id: 'q1', status: 'IN_PROGRESS', claimedByUserId: 'other' }));

      const res = await http().post('/queue/q1/skip').set('Authorization', auth).expect(409);
      expect(typeof res.body.error).toBe('string');
      expect(notifyChange).not.toHaveBeenCalled();
    });

    it('404 for an unknown item', async () => {
      await http()
        .post('/queue/nope/skip')
        .set('Authorization', api.login({ role: 'COMMITTEE' }))
        .expect(404);
    });
  });

  describe('POST /queue/:id/claim (STAFF scope)', () => {
    it('200 for STAFF whose assignment covers the item; 403 outside it', async () => {
      const auth = api.login({ id: 'staff-1', role: 'STAFF' });
      assignmentRepo.seedScope('staff-1', [{ problemNumber: 1, schoolId: 'school-1' }]);
      queueRepo.seed(makeQueueItem({ id: 'in-scope', problemNumber: 1, schoolId: 'school-1' }));
      queueRepo.seed(makeQueueItem({ id: 'other-school', problemNumber: 1, schoolId: 'school-9' }));

      await http().post('/queue/other-school/claim').set('Authorization', auth).expect(403);
      await http().post('/queue/in-scope/claim').set('Authorization', auth).expect(200);
      expect((await queueRepo.findById('in-scope'))?.claimedByUserId).toBe('staff-1');
    });
  });

  describe('POST /queue/:id/release', () => {
    it('non-owner examiner gets 409; ADMIN may force-release', async () => {
      queueRepo.seed(makeQueueItem({ id: 'q1', status: 'IN_PROGRESS', claimedByUserId: 'x' }));
      await http()
        .post('/queue/q1/release')
        .set('Authorization', api.login({ role: 'COMMITTEE' }))
        .expect(409);
      await http()
        .post('/queue/q1/release')
        .set('Authorization', api.login({ role: 'ADMIN' }))
        .expect(200);
      expect((await queueRepo.findById('q1'))?.status).toBe('WAITING');
    });
  });
});
