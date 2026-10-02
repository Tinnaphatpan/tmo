import request from 'supertest';
import { EMPTY } from 'rxjs';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ApiTestApp, createApiTestApp } from '../../testing/api-test-app';
import { FakeQueueRepository, makeQueueItem } from '../../testing/fake-queue.repository';
import { FakeSchoolsRepository } from '../../testing/fake-schools.repository';
import { FakeAuditLogRepository } from '../../testing/fake-audit-log.repository';
import { FakeTransactionRunner } from '../../testing/fake-transaction-runner';
import { QueueRepository } from '../queue/queue.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { TransactionRunner } from '../../database/transaction-runner';
import { RealtimeService } from '../realtime/realtime.service';
import { SCHEDULE_SCHOOL_ORDER, sortSchoolsForSchedule } from '../queue/schedule-order';
import { GenerateQueueScheduleUseCase } from './use-cases/generate-queue-schedule.use-case';
import { ManageQueueUseCase } from './use-cases/manage-queue.use-case';
import { ResetQueueUseCase } from './use-cases/reset-queue.use-case';
import { ResetQueueRepository } from './reset-queue.repository';
import { FakeResetQueueRepository } from '../../testing/fake-reset-queue.repository';
import { AdminQueueController } from './admin-queue.controller';

const seedSchools = (repo: FakeSchoolsRepository, codes: readonly string[]) =>
  codes.forEach((code, i) => repo.seed({ id: `id-${code}`, name: `ศูนย์ ${String(i).padStart(2, '0')} ${code}`, code }));

function setUp(codes: readonly string[] = SCHEDULE_SCHOOL_ORDER) {
  const queue = new FakeQueueRepository();
  const schools = new FakeSchoolsRepository();
  // Insert in REVERSE order to prove the use-case does its own ordering.
  seedSchools(schools, [...codes].reverse());
  const audit = new FakeAuditLogRepository();
  const useCase = new GenerateQueueScheduleUseCase(queue, schools, audit, new FakeTransactionRunner());
  return { queue, schools, audit, useCase };
}

describe('sortSchoolsForSchedule', () => {
  it('follows the poster order, unknown codes last (by name)', () => {
    const sorted = sortSchoolsForSchedule([
      { name: 'z', code: 'ZZZ' },
      { name: 'b', code: 'BUU' },
      { name: 'a', code: 'CMU' },
      { name: 'n', code: null },
    ]);
    expect(sorted.map((s) => s.code)).toEqual(['CMU', 'BUU', null, 'ZZZ']);
  });
});

describe('GenerateQueueScheduleUseCase', () => {
  it('creates 16 x 5 = 80 items with 15-minute slots from 13:30 Bangkok on the given day, in one audited run', async () => {
    const { useCase, queue, audit } = setUp();
    const res = await useCase.execute({ date: '2026-05-17', actorId: 'admin' });

    expect(res).toMatchObject({ created: 80, updated: 0, total: 80, firstSlotAt: '2026-05-17T06:30:00.000Z' });
    expect(queue.items).toHaveLength(80);
    const times = new Set(queue.items.map((i) => i.scheduledAt!.toISOString()));
    expect(times.size).toBe(16);
    expect([...times].sort()[15]).toBe('2026-05-17T10:15:00.000Z'); // 17:15 -> slot ends 17:30
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      action: 'QUEUE_SCHEDULE_GENERATED',
      performedBy: 'admin',
    });
    expect(JSON.parse(audit.entries[0].newValue!)).toMatchObject({ date: '2026-05-17', created: 80 });
  });

  it('reproduces the printed poster: problem 1 runs CMU, KKU, SU ... and problem 2 starts at BUU', async () => {
    const { useCase, queue, schools } = setUp();
    await useCase.execute({ date: '2026-05-17', actorId: 'admin' });
    const codeOf = (id: string) => schools.schools.find((s) => s.id === id)!.code;
    const at = (problem: number, slot: number) => {
      const t = new Date(Date.parse('2026-05-17T06:30:00Z') + slot * 15 * 60_000).toISOString();
      const item = queue.items.find((i) => i.problemNumber === problem && i.scheduledAt!.toISOString() === t)!;
      return codeOf(item.schoolId);
    };
    expect([0, 1, 2, 3].map((s) => at(1, s))).toEqual(['CMU', 'KKU', 'SU', 'SA-SWU']);
    expect(at(2, 0)).toBe('BUU'); // matches the poster's ข้อ 2 @ 13:30
    expect(at(3, 0)).toBe('PSUPN');
    expect(at(4, 0)).toBe('YB-KU');
    expect(at(5, 0)).toBe('WU');
  });

  it('never books a school twice in one slot and every school meets every problem once', async () => {
    const { useCase, queue } = setUp();
    await useCase.execute({ date: '2026-05-17', actorId: 'admin' });
    const bySlot = new Map<string, string[]>();
    for (const i of queue.items) {
      const k = i.scheduledAt!.toISOString();
      bySlot.set(k, [...(bySlot.get(k) ?? []), i.schoolId]);
    }
    for (const ids of bySlot.values()) expect(new Set(ids).size).toBe(ids.length);
    for (const p of [1, 2, 3, 4, 5]) {
      expect(new Set(queue.items.filter((i) => i.problemNumber === p).map((i) => i.schoolId)).size).toBe(16);
    }
  });

  it('is idempotent: a second run only re-times (creates nothing, no duplicates)', async () => {
    const { useCase, queue } = setUp();
    await useCase.execute({ date: '2026-05-17', actorId: 'admin' });
    const res = await useCase.execute({ date: '2026-05-18', actorId: 'admin' });
    expect(res).toMatchObject({ created: 0, updated: 80 });
    expect(queue.items).toHaveLength(80);
    expect(queue.items.every((i) => i.scheduledAt!.toISOString().startsWith('2026-05-18'))).toBe(true);
  });

  it('adopts existing untimed WAITING items (the migrated-data case) instead of duplicating them', async () => {
    const { useCase, queue } = setUp();
    queue.seed(makeQueueItem({ id: 'old-1', schoolId: 'id-AFAPS', problemNumber: 1, position: 10, scheduledAt: null }));
    queue.seed(makeQueueItem({ id: 'old-2', schoolId: 'id-MWIT', problemNumber: 1, position: 20, scheduledAt: null }));

    const res = await useCase.execute({ date: '2026-05-17', actorId: 'admin' });

    expect(res).toMatchObject({ created: 78, updated: 2, total: 80 });
    expect(queue.items).toHaveLength(80);
    const old = queue.items.find((i) => i.id === 'old-1')!;
    expect(old.scheduledAt).not.toBeNull();
    expect(old.position).toBe(12); // AFAPS is 13th in the poster order -> slot 12
  });

  it('refuses (409) once any item is claimed or done, changing nothing', async () => {
    const { useCase, queue, audit } = setUp();
    queue.seed(makeQueueItem({ id: 'busy', schoolId: 'id-CMU', problemNumber: 1, status: 'IN_PROGRESS', claimedByUserId: 'j' }));
    await expect(useCase.execute({ actorId: 'admin' })).rejects.toBeInstanceOf(ConflictException);
    expect(queue.items).toHaveLength(1);
    expect(audit.entries).toHaveLength(0);

    queue.items.length = 0;
    queue.seed(makeQueueItem({ id: 'done', schoolId: 'id-CMU', problemNumber: 1, status: 'DONE' }));
    await expect(useCase.execute({ actorId: 'admin' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('400 with fewer than 5 schools (a slot would double-book) and for a malformed date', async () => {
    const few = setUp(['CMU', 'KKU', 'SU']);
    await expect(few.useCase.execute({ date: '2026-05-17', actorId: 'a' })).rejects.toBeInstanceOf(BadRequestException);
    const { useCase } = setUp();
    await expect(useCase.execute({ date: 'not-a-date', actorId: 'a' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('defaults the date to today in Bangkok', async () => {
    const { useCase } = setUp();
    const res = await useCase.execute({ actorId: 'admin' });
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    expect(res.firstSlotAt).toBe(new Date(`${today}T13:30:00+07:00`).toISOString());
  });
});

describe('POST /admin/queue/generate (HTTP)', () => {
  let api: ApiTestApp;
  let queue: FakeQueueRepository;
  const notifyChange = jest.fn();

  beforeEach(async () => {
    queue = new FakeQueueRepository();
    const schools = new FakeSchoolsRepository();
    seedSchools(schools, SCHEDULE_SCHOOL_ORDER);
    notifyChange.mockClear();
    api = await createApiTestApp({
      controllers: [AdminQueueController],
      providers: [
        { provide: QueueRepository, useValue: queue },
        { provide: SchoolsRepository, useValue: schools },
        { provide: AuditLogRepository, useValue: new FakeAuditLogRepository() },
        { provide: TransactionRunner, useValue: new FakeTransactionRunner() },
        { provide: RealtimeService, useValue: { notifyChange, stream: EMPTY } },
        { provide: ResetQueueRepository, useValue: new FakeResetQueueRepository() },
        GenerateQueueScheduleUseCase,
        ManageQueueUseCase,
        ResetQueueUseCase,
      ],
    });
  });

  afterEach(() => api.app.close());

  const post = (body: object | undefined, auth?: string) => {
    const r = request(api.app.getHttpServer()).post('/admin/queue/generate');
    return (auth ? r.set('Authorization', auth) : r).send(body);
  };

  it('401 anonymous; 403 for every non-admin role', async () => {
    await post({}).expect(401);
    for (const role of ['COMMITTEE', 'STAFF', 'TEAM_LEADER'] as const) {
      await post({}, api.login({ role })).expect(403);
    }
    expect(queue.items).toHaveLength(0);
  });

  it('200 with counts, creates the queue, notifies live clients', async () => {
    const res = await post({ date: '2026-05-17' }, api.login({ role: 'ADMIN' })).expect(201);
    expect(res.body).toEqual({ created: 80, updated: 0, total: 80, firstSlotAt: '2026-05-17T06:30:00.000Z' });
    expect(queue.items).toHaveLength(80);
    expect(notifyChange).toHaveBeenCalledTimes(1);
  });

  it('works with an empty body (date defaults to today)', async () => {
    await post({}, api.login({ role: 'ADMIN' })).expect(201);
    expect(queue.items).toHaveLength(80);
  });

  it('400 for a malformed date or unknown field; 409 when work has started; no notify on failure', async () => {
    const auth = api.login({ role: 'ADMIN' });
    await post({ date: '17/05/2026' }, auth).expect(400);
    await post({ date: '2026-05-17', extra: 1 }, auth).expect(400);
    queue.seed(makeQueueItem({ id: 'busy', schoolId: 'id-CMU', status: 'DONE' }));
    await post({ date: '2026-05-17' }, auth).expect(409);
    expect(queue.items).toHaveLength(1);
    expect(notifyChange).not.toHaveBeenCalled();
  });
});
