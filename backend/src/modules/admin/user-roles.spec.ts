import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTestApp, createApiTestApp } from '../../testing/api-test-app';
import { FakeUsersRepository, makeUser } from '../../testing/fake-users.repository';
import { FakeUserAssignmentRepository } from '../../testing/fake-user-assignment.repository';
import { FakeSchoolsRepository } from '../../testing/fake-schools.repository';
import { FakeQueueRepository, makeQueueItem } from '../../testing/fake-queue.repository';
import { FakeAuditLogRepository } from '../../testing/fake-audit-log.repository';
import { FakeTransactionRunner } from '../../testing/fake-transaction-runner';
import { FakeFileStorage } from '../../testing/fake-file-storage';
import { UserAssignmentRepository } from '../user-assignment/user-assignment.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { QueueRepository } from '../queue/queue.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { TransactionRunner } from '../../database/transaction-runner';
import { FileStorage } from '../../common/file-storage';
import { AppConfig } from '../../config/configuration';
import { ChangeUserRoleUseCase } from './use-cases/change-user-role.use-case';
import { ManageTeamLeaderUseCase } from './use-cases/manage-team-leader.use-case';
import { UploadSignatureUseCase } from './use-cases/upload-signature.use-case';
import { AdminTeamLeadersController } from './admin-team-leaders.controller';
import { AdminUsersController } from './admin-users.controller';

const SCHOOL_A = '11111111-1111-4111-8111-111111111111';
const SCHOOL_B = '22222222-2222-4222-8222-222222222222';
const UID = '33333333-3333-4333-8333-333333333333';
const config = { get: () => 4 } as unknown as ConfigService<AppConfig, true>;

function useCaseSetUp() {
  const users = new FakeUsersRepository();
  const assignments = new FakeUserAssignmentRepository();
  const schools = new FakeSchoolsRepository();
  schools.seed({ id: SCHOOL_A, name: 'A', code: 'A' });
  schools.seed({ id: SCHOOL_B, name: 'B', code: 'B' });
  const queue = new FakeQueueRepository();
  const audit = new FakeAuditLogRepository();
  const useCase = new ChangeUserRoleUseCase(
    users,
    assignments,
    schools,
    queue,
    audit,
    new FakeTransactionRunner(),
  );
  users.seed(makeUser({ id: 'actor', role: 'ADMIN' }));
  return { users, assignments, schools, queue, audit, useCase };
}

describe('ChangeUserRoleUseCase', () => {
  it('COMMITTEE -> STAFF: swaps role, sets the new scope, audits with before/after snapshots', async () => {
    const { useCase, users, assignments, audit } = useCaseSetUp();
    users.seed(makeUser({ id: 'u', role: 'COMMITTEE' }));
    assignments.seed('u', [1, 2]);

    await useCase.execute({
      userId: 'u',
      actorId: 'actor',
      role: 'STAFF',
      assignments: [{ problemNumber: 3, schoolId: SCHOOL_A }],
    });

    expect((await users.findById('u'))?.role).toBe('STAFF');
    expect(await assignments.findScopeByUser('u')).toEqual([{ problemNumber: 3, schoolId: SCHOOL_A }]);
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: 'u',
      performedBy: 'actor',
    });
    expect(JSON.parse(audit.entries[0].oldValue!)).toMatchObject({ role: 'COMMITTEE' });
    expect(JSON.parse(audit.entries[0].oldValue!).assignments).toHaveLength(2);
    expect(JSON.parse(audit.entries[0].newValue!)).toMatchObject({ role: 'STAFF' });
  });

  it('STAFF -> COMMITTEE: forces all-schools scope and de-duplicates problems', async () => {
    const { useCase, users, assignments } = useCaseSetUp();
    users.seed(makeUser({ id: 'u', role: 'STAFF' }));
    await useCase.execute({
      userId: 'u',
      actorId: 'actor',
      role: 'COMMITTEE',
      assignments: [
        { problemNumber: 2, schoolId: SCHOOL_A },
        { problemNumber: 2, schoolId: SCHOOL_B },
        { problemNumber: 4, schoolId: null },
      ],
    });
    expect(await assignments.findScopeByUser('u')).toEqual([
      { problemNumber: 2, schoolId: null },
      { problemNumber: 4, schoolId: null },
    ]);
  });

  it('-> TEAM_LEADER: sets SchoolId and clears assignments; TEAM_LEADER -> STAFF clears SchoolId', async () => {
    const { useCase, users, assignments } = useCaseSetUp();
    users.seed(makeUser({ id: 'u', role: 'COMMITTEE' }));
    assignments.seed('u', [1]);

    await useCase.execute({ userId: 'u', actorId: 'actor', role: 'TEAM_LEADER', schoolId: SCHOOL_A });
    expect(await users.findById('u')).toMatchObject({ role: 'TEAM_LEADER', schoolId: SCHOOL_A });
    expect(await assignments.findScopeByUser('u')).toEqual([]);

    await useCase.execute({
      userId: 'u',
      actorId: 'actor',
      role: 'STAFF',
      assignments: [{ problemNumber: 5, schoolId: null }],
    });
    expect(await users.findById('u')).toMatchObject({ role: 'STAFF', schoolId: null });
  });

  it('refuses ADMIN in both directions (403) and a no-op change (400)', async () => {
    const { useCase, users } = useCaseSetUp();
    await expect(
      useCase.execute({ userId: 'actor', actorId: 'actor', role: 'STAFF', assignments: [{ problemNumber: 1, schoolId: null }] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    users.seed(makeUser({ id: 'u', role: 'COMMITTEE' }));
    await expect(
      useCase.execute({ userId: 'u', actorId: 'actor', role: 'ADMIN' as never }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      useCase.execute({ userId: 'u', actorId: 'actor', role: 'COMMITTEE', assignments: [{ problemNumber: 1, schoolId: null }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404 for an unknown user', async () => {
    const { useCase } = useCaseSetUp();
    await expect(
      useCase.execute({ userId: 'ghost', actorId: 'actor', role: 'TEAM_LEADER', schoolId: SCHOOL_A }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('409 while the user still holds an IN_PROGRESS item; nothing is changed or audited', async () => {
    const { useCase, users, queue, audit } = useCaseSetUp();
    users.seed(makeUser({ id: 'u', role: 'COMMITTEE' }));
    queue.seed(makeQueueItem({ id: 'q', status: 'IN_PROGRESS', claimedByUserId: 'u' }));
    await expect(
      useCase.execute({ userId: 'u', actorId: 'actor', role: 'TEAM_LEADER', schoolId: SCHOOL_A }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect((await users.findById('u'))?.role).toBe('COMMITTEE');
    expect(audit.entries).toHaveLength(0);
  });

  it('400 for a missing/unknown scope, and writes nothing', async () => {
    const { useCase, users, audit } = useCaseSetUp();
    users.seed(makeUser({ id: 'u', role: 'COMMITTEE' }));
    const bad = [
      { role: 'TEAM_LEADER' as const },
      { role: 'TEAM_LEADER' as const, schoolId: 'ghost-school' },
      { role: 'STAFF' as const },
      { role: 'STAFF' as const, assignments: [] },
      { role: 'STAFF' as const, assignments: [{ problemNumber: 1, schoolId: 'ghost-school' }] },
      {
        role: 'STAFF' as const,
        assignments: [
          { problemNumber: 1, schoolId: SCHOOL_A },
          { problemNumber: 1, schoolId: SCHOOL_A },
        ],
      },
    ];
    for (const b of bad) {
      await expect(useCase.execute({ userId: 'u', actorId: 'actor', ...b })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect((await users.findById('u'))?.role).toBe('COMMITTEE');
    expect(audit.entries).toHaveLength(0);
  });
});

describe('ManageTeamLeaderUseCase', () => {
  function setUp() {
    const users = new FakeUsersRepository();
    const schools = new FakeSchoolsRepository();
    schools.seed({ id: SCHOOL_A, name: 'A', code: 'A' });
    schools.seed({ id: SCHOOL_B, name: 'B', code: 'B' });
    return { users, useCase: new ManageTeamLeaderUseCase(users, schools, config) };
  }

  it('create: TEAM_LEADER bound to the school, bcrypt hash; 400 for an unknown school', async () => {
    const { useCase, users } = setUp();
    const { id } = await useCase.create({ username: 'tl', displayName: 'TL', password: 'password123', schoolId: SCHOOL_A });
    const user = await users.findById(id);
    expect(user).toMatchObject({ role: 'TEAM_LEADER', schoolId: SCHOOL_A });
    expect(await bcrypt.compare('password123', user!.passwordHash)).toBe(true);
    await expect(
      useCase.create({ username: 'x', displayName: 'x', password: 'password123', schoolId: 'ghost' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update: re-homes to another school and/or changes password; validates the school', async () => {
    const { useCase, users } = setUp();
    users.seed(makeUser({ id: 'tl', role: 'TEAM_LEADER', schoolId: SCHOOL_A, passwordHash: 'old' }));
    await useCase.update('tl', { schoolId: SCHOOL_B });
    expect((await users.findById('tl'))?.schoolId).toBe(SCHOOL_B);
    await useCase.update('tl', { password: 'newpassword1' });
    expect(await bcrypt.compare('newpassword1', (await users.findById('tl'))!.passwordHash)).toBe(true);
    await expect(useCase.update('tl', { schoolId: 'ghost' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update/remove refuse non-team-leaders (403) and unknown ids (404)', async () => {
    const { useCase, users } = setUp();
    users.seed(makeUser({ id: 'admin', role: 'ADMIN' }));
    users.seed(makeUser({ id: 'com', role: 'COMMITTEE' }));
    for (const id of ['admin', 'com']) {
      await expect(useCase.remove(id)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(useCase.update(id, { password: 'password123' })).rejects.toBeInstanceOf(ForbiddenException);
    }
    await expect(useCase.remove('ghost')).rejects.toBeInstanceOf(NotFoundException);
    expect(await users.findById('admin')).not.toBeNull();
  });

  it('remove deletes a team leader', async () => {
    const { useCase, users } = setUp();
    users.seed(makeUser({ id: 'tl', role: 'TEAM_LEADER', schoolId: SCHOOL_A }));
    await useCase.remove('tl');
    expect(await users.findById('tl')).toBeNull();
  });
});

describe('Team leader + role-change endpoints (HTTP)', () => {
  let api: ApiTestApp;
  let assignments: FakeUserAssignmentRepository;
  let audit: FakeAuditLogRepository;

  beforeEach(async () => {
    assignments = new FakeUserAssignmentRepository();
    audit = new FakeAuditLogRepository();
    const schools = new FakeSchoolsRepository();
    schools.seed({ id: SCHOOL_A, name: 'A', code: 'A' });
    api = await createApiTestApp({
      controllers: [AdminTeamLeadersController, AdminUsersController],
      providers: [
        { provide: UserAssignmentRepository, useValue: assignments },
        { provide: SchoolsRepository, useValue: schools },
        { provide: QueueRepository, useValue: new FakeQueueRepository() },
        { provide: AuditLogRepository, useValue: audit },
        { provide: TransactionRunner, useValue: new FakeTransactionRunner() },
        { provide: FileStorage, useValue: new FakeFileStorage() },
        { provide: ConfigService, useValue: { get: () => 4 } },
        ManageTeamLeaderUseCase,
        ChangeUserRoleUseCase,
        UploadSignatureUseCase,
      ],
    });
  });

  afterEach(() => api.app.close());

  const http = () => request(api.app.getHttpServer());
  const admin = () => api.login({ id: 'admin-1', role: 'ADMIN' });
  const tlBody = (over: object = {}) => ({
    username: 'tl-new',
    displayName: 'TL New',
    password: 'password123',
    schoolId: SCHOOL_A,
    ...over,
  });

  describe('/admin/team-leaders', () => {
    it('401 anonymous; 403 for every non-admin role on POST/PATCH/DELETE', async () => {
      await http().post('/admin/team-leaders').send(tlBody()).expect(401);
      for (const role of ['COMMITTEE', 'STAFF', 'TEAM_LEADER'] as const) {
        const auth = api.login({ role });
        await http().post('/admin/team-leaders').set('Authorization', auth).send(tlBody()).expect(403);
        await http().patch('/admin/team-leaders').set('Authorization', auth).send({ id: UID }).expect(403);
        await http().delete('/admin/team-leaders').query({ id: UID }).set('Authorization', auth).expect(403);
      }
    });

    it('POST creates a team leader who can be found with the right school', async () => {
      const res = await http().post('/admin/team-leaders').set('Authorization', admin()).send(tlBody()).expect(201);
      const user = await api.usersRepo.findById(res.body.user.id);
      expect(user).toMatchObject({ role: 'TEAM_LEADER', schoolId: SCHOOL_A });
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('POST 400: short password, missing/invalid school, unknown school, unknown field', async () => {
      const post = (b: object) => http().post('/admin/team-leaders').set('Authorization', admin()).send(b);
      await post(tlBody({ password: 'short' })).expect(400);
      await post(tlBody({ schoolId: undefined })).expect(400);
      await post(tlBody({ schoolId: 'not-a-uuid' })).expect(400);
      await post(tlBody({ schoolId: SCHOOL_B })).expect(400); // valid UUID, no such school
      await post(tlBody({ role: 'ADMIN' })).expect(400);
    });

    it('PATCH re-homes; DELETE removes; both refuse non-team-leaders', async () => {
      api.usersRepo.seed(makeUser({ id: UID, role: 'TEAM_LEADER', schoolId: SCHOOL_A }));
      await http().patch('/admin/team-leaders').set('Authorization', admin()).send({ id: UID, password: 'newpassword1' }).expect(200);

      const com = '44444444-4444-4444-8444-444444444444';
      api.usersRepo.seed(makeUser({ id: com, role: 'COMMITTEE' }));
      await http().delete('/admin/team-leaders').query({ id: com }).set('Authorization', admin()).expect(403);
      expect(await api.usersRepo.findById(com)).not.toBeNull();

      await http().delete('/admin/team-leaders').query({ id: UID }).set('Authorization', admin()).expect(200);
      expect(await api.usersRepo.findById(UID)).toBeNull();
    });
  });

  describe('PATCH /admin/users/:id/role', () => {
    const patch = (id: string, body: object, auth = admin()) =>
      http().patch(`/admin/users/${id}/role`).set('Authorization', auth).send(body);

    it('401 anonymous; 403 for every non-admin role', async () => {
      await http().patch(`/admin/users/${UID}/role`).send({ role: 'STAFF' }).expect(401);
      for (const role of ['COMMITTEE', 'STAFF', 'TEAM_LEADER'] as const) {
        await patch(UID, { role: 'STAFF' }, api.login({ role })).expect(403);
      }
    });

    it('200: changes role + scope in one call and records who did it', async () => {
      api.usersRepo.seed(makeUser({ id: UID, role: 'COMMITTEE' }));
      assignments.seed(UID, [1]);
      await patch(UID, { role: 'STAFF', assignments: [{ problemNumber: 2, schoolId: SCHOOL_A }] }).expect(200).expect({ ok: true });

      expect((await api.usersRepo.findById(UID))?.role).toBe('STAFF');
      expect(await assignments.findScopeByUser(UID)).toEqual([{ problemNumber: 2, schoolId: SCHOOL_A }]);
      expect(audit.entries[0]).toMatchObject({ action: 'USER_ROLE_CHANGED', performedBy: 'admin-1' });
    });

    it('400 validation: ADMIN is not an allowed target, unknown role, bad school id, bad problem, extra field', async () => {
      api.usersRepo.seed(makeUser({ id: UID, role: 'COMMITTEE' }));
      await patch(UID, { role: 'ADMIN' }).expect(400);
      await patch(UID, { role: 'GOD' }).expect(400);
      await patch(UID, {}).expect(400);
      await patch(UID, { role: 'TEAM_LEADER', schoolId: 'x' }).expect(400);
      await patch(UID, { role: 'STAFF', assignments: [{ problemNumber: 9, schoolId: null }] }).expect(400);
      await patch(UID, { role: 'STAFF', assignments: [{ problemNumber: 1, schoolId: null }], extra: 1 }).expect(400);
      expect((await api.usersRepo.findById(UID))?.role).toBe('COMMITTEE');
    });

    it('business errors surface with the right status: 404 unknown, 403 admin target, 400 same role / missing scope', async () => {
      await patch(UID, { role: 'STAFF', assignments: [{ problemNumber: 1, schoolId: null }] }).expect(404);
      api.usersRepo.seed(makeUser({ id: UID, role: 'ADMIN' }));
      await patch(UID, { role: 'STAFF', assignments: [{ problemNumber: 1, schoolId: null }] }).expect(403);

      const other = '55555555-5555-4555-8555-555555555555';
      api.usersRepo.seed(makeUser({ id: other, role: 'COMMITTEE' }));
      await patch(other, { role: 'COMMITTEE', assignments: [{ problemNumber: 1, schoolId: null }] }).expect(400);
      await patch(other, { role: 'STAFF' }).expect(400);
      await patch(other, { role: 'TEAM_LEADER' }).expect(400);
    });
  });
});
