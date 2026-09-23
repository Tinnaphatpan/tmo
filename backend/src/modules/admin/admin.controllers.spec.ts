import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { ApiTestApp, createApiTestApp } from '../../testing/api-test-app';
import { makeUser } from '../../testing/fake-users.repository';
import { FakeUserAssignmentRepository } from '../../testing/fake-user-assignment.repository';
import { FakeFileStorage } from '../../testing/fake-file-storage';
import { UserAssignmentRepository } from '../user-assignment/user-assignment.repository';
import { FileStorage } from '../../common/file-storage';
import { AdminPermissionsController } from './admin-permissions.controller';
import { AdminStaffController } from './admin-staff.controller';
import { AdminUsersController } from './admin-users.controller';
import { GetPermissionMatrixUseCase } from './use-cases/get-permission-matrix.use-case';
import { ManageStaffAssignmentsUseCase } from './use-cases/manage-staff.use-case';
import { ListStaffUseCase } from './use-cases/list-staff.use-case';
import { UploadSignatureUseCase } from './use-cases/upload-signature.use-case';

const SCHOOL = '11111111-1111-4111-8111-111111111111';

describe('Admin controllers (HTTP)', () => {
  let api: ApiTestApp;
  let assignmentRepo: FakeUserAssignmentRepository;
  let fileStorage: FakeFileStorage;

  beforeEach(async () => {
    assignmentRepo = new FakeUserAssignmentRepository();
    fileStorage = new FakeFileStorage();
    api = await createApiTestApp({
      controllers: [AdminPermissionsController, AdminStaffController, AdminUsersController],
      providers: [
        { provide: UserAssignmentRepository, useValue: assignmentRepo },
        { provide: FileStorage, useValue: fileStorage },
        { provide: ConfigService, useValue: { get: () => 4 } },
        GetPermissionMatrixUseCase,
        ManageStaffAssignmentsUseCase,
        ListStaffUseCase,
        UploadSignatureUseCase,
      ],
    });
  });

  afterEach(() => api.app.close());

  const http = () => request(api.app.getHttpServer());
  const admin = () => api.login({ role: 'ADMIN' });

  describe('GET /admin/permissions', () => {
    it('401 anonymous, 403 for every non-admin role', async () => {
      await http().get('/admin/permissions').expect(401);
      for (const role of ['COMMITTEE', 'STAFF', 'TEAM_LEADER'] as const) {
        await http().get('/admin/permissions').set('Authorization', api.login({ role })).expect(403);
      }
    });

    it('200: lists non-admin users with scope, signature flag and schoolId', async () => {
      api.usersRepo.seed(makeUser({ id: 'c1', role: 'COMMITTEE' }));
      api.usersRepo.seed(makeUser({ id: 's1', role: 'STAFF' }));
      api.usersRepo.seed(
        makeUser({ id: 't1', role: 'TEAM_LEADER', schoolId: SCHOOL, signaturePath: 'x.png' }),
      );
      assignmentRepo.seed('c1', [1, 2]);
      assignmentRepo.seedScope('s1', [{ problemNumber: 3, schoolId: SCHOOL }]);

      const res = await http().get('/admin/permissions').set('Authorization', admin()).expect(200);

      const byId = Object.fromEntries(res.body.map((r: { id: string }) => [r.id, r]));
      expect(Object.keys(byId).sort()).toEqual(['c1', 's1', 't1']);
      expect(byId.c1.assignments).toHaveLength(2);
      expect(byId.s1.assignments).toEqual([{ problemNumber: 3, schoolId: SCHOOL }]);
      expect(byId.t1).toMatchObject({ schoolId: SCHOOL, hasSignature: true, assignments: [] });
    });
  });

  describe('/admin/staff', () => {
    const body = (over: object = {}) => ({
      username: 'staff-new',
      displayName: 'Staff New',
      password: 'password123',
      assignments: [{ problemNumber: 2, schoolId: SCHOOL }],
      ...over,
    });

    it('403 for COMMITTEE', async () => {
      await http()
        .post('/admin/staff')
        .set('Authorization', api.login({ role: 'COMMITTEE' }))
        .send(body())
        .expect(403);
    });

    it('creates a STAFF user with scope, then GET lists it (no password hash leaked)', async () => {
      const created = await http()
        .post('/admin/staff')
        .set('Authorization', admin())
        .send(body())
        .expect(201);
      expect(created.body.user).toMatchObject({ username: 'staff-new' });

      const list = await http().get('/admin/staff').set('Authorization', admin()).expect(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0].assignments).toEqual([{ problemNumber: 2, schoolId: SCHOOL }]);
      expect(JSON.stringify(list.body)).not.toContain('passwordHash');
    });

    it('400 on validation failures: short password, empty assignments, bad problem number, unknown field', async () => {
      const post = (b: object) =>
        http().post('/admin/staff').set('Authorization', admin()).send(b);
      await post(body({ password: 'short' })).expect(400);
      await post(body({ assignments: [] })).expect(400);
      await post(body({ assignments: [{ problemNumber: 9, schoolId: null }] })).expect(400);
      await post(body({ role: 'ADMIN' })).expect(400);
    });

    it('400 on duplicate (problem, school) rows in one request', async () => {
      const dup = { problemNumber: 1, schoolId: SCHOOL };
      await http()
        .post('/admin/staff')
        .set('Authorization', admin())
        .send(body({ assignments: [dup, dup] }))
        .expect(400);
    });

    it('PATCH replaces the scope', async () => {
      const id = '22222222-2222-4222-8222-222222222222'; // DTO requires a UUID
      api.usersRepo.seed(makeUser({ id, role: 'STAFF' }));
      await http()
        .patch('/admin/staff')
        .set('Authorization', admin())
        .send({ id, assignments: [{ problemNumber: 5, schoolId: null }] })
        .expect(200);
      expect(await assignmentRepo.findScopeByUser(id)).toEqual([
        { problemNumber: 5, schoolId: null },
      ]);
    });

    it('DELETE refuses to remove an ADMIN (403), removes a STAFF (200)', async () => {
      api.usersRepo.seed(makeUser({ id: 'other-admin', role: 'ADMIN' }));
      await http().delete('/admin/staff').query({ id: 'other-admin' }).set('Authorization', admin()).expect(403);

      api.usersRepo.seed(makeUser({ id: 'st', role: 'STAFF' }));
      await http().delete('/admin/staff').query({ id: 'st' }).set('Authorization', admin()).expect(200);
      expect(await api.usersRepo.findById('st')).toBeNull();
    });
  });

  describe('POST /admin/users/:id/signature', () => {
    const PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );

    it('403 for non-admin', async () => {
      await http()
        .post('/admin/users/u1/signature')
        .set('Authorization', api.login({ role: 'TEAM_LEADER' }))
        .attach('file', PNG, 'sig.png')
        .expect(403);
    });

    it('400 when no file is attached', async () => {
      api.usersRepo.seed(makeUser({ id: 'u1', role: 'COMMITTEE' }));
      await http().post('/admin/users/u1/signature').set('Authorization', admin()).expect(400);
    });

    it('400 for a non-image extension, 404 for an unknown user', async () => {
      api.usersRepo.seed(makeUser({ id: 'u1', role: 'COMMITTEE' }));
      await http()
        .post('/admin/users/u1/signature')
        .set('Authorization', admin())
        .attach('file', Buffer.from('x'), 'sig.pdf')
        .expect(400);
      await http()
        .post('/admin/users/ghost/signature')
        .set('Authorization', admin())
        .attach('file', PNG, 'sig.png')
        .expect(404);
    });

    it('201/200: stores the image and records the path on the user', async () => {
      api.usersRepo.seed(makeUser({ id: 'u1', role: 'COMMITTEE' }));
      const res = await http()
        .post('/admin/users/u1/signature')
        .set('Authorization', admin())
        .attach('file', PNG, 'sig.png');
      expect([200, 201]).toContain(res.status);
      expect(res.body.signaturePath).toContain('u1.png');
      expect(fileStorage.signatures.size).toBe(1);
      expect((await api.usersRepo.findById('u1'))?.signaturePath).toBe(res.body.signaturePath);
    });
  });
});
