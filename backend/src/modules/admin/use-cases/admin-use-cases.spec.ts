import * as sql from 'mssql';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ManageCommitteeUseCase } from './manage-committee.use-case';
import { ManageQueueUseCase } from './manage-queue.use-case';
import { ManageSchoolsUseCase } from './manage-schools.use-case';
import { GetDashboardUseCase } from './get-dashboard.use-case';
import { ListCommitteeUseCase } from './list-committee.use-case';
import { ListStaffUseCase } from './list-staff.use-case';
import { UploadSignatureUseCase } from './upload-signature.use-case';
import { FakeUsersRepository, makeUser } from '../../../testing/fake-users.repository';
import { FakeUserAssignmentRepository } from '../../../testing/fake-user-assignment.repository';
import { FakeQueueRepository, makeQueueItem } from '../../../testing/fake-queue.repository';
import { FakeSchoolsRepository } from '../../../testing/fake-schools.repository';
import { FakeStudentsRepository, makeStudent } from '../../../testing/fake-students.repository';
import { FakeScoreEditRequestsRepository } from '../../../testing/fake-score-edit-requests.repository';
import { FakeSettingsRepository } from '../../../testing/fake-settings.repository';
import { FakeFileStorage } from '../../../testing/fake-file-storage';
import { AppConfig } from '../../../config/configuration';

const config = { get: () => 4 } as unknown as ConfigService<AppConfig, true>;

/** A mssql RequestError carrying a SQL Server error number, as the driver raises it. */
const sqlError = (number: number) => Object.assign(new sql.RequestError('sql'), { number });

describe('ManageCommitteeUseCase', () => {
  function setUp() {
    const usersRepo = new FakeUsersRepository();
    const assignmentRepo = new FakeUserAssignmentRepository();
    return { usersRepo, assignmentRepo, useCase: new ManageCommitteeUseCase(usersRepo, assignmentRepo, config) };
  }

  it('creates a COMMITTEE user with a bcrypt hash and all-school assignments', async () => {
    const { useCase, usersRepo, assignmentRepo } = setUp();
    const { id } = await useCase.create({
      username: 'c1',
      displayName: 'C One',
      password: 'password123',
      problemNumbers: [1, 3],
    });
    const user = await usersRepo.findById(id);
    expect(user?.role).toBe('COMMITTEE');
    expect(user?.passwordHash).not.toBe('password123');
    expect(await bcrypt.compare('password123', user!.passwordHash)).toBe(true);
    expect(await assignmentRepo.findScopeByUser(id)).toEqual([
      { problemNumber: 1, schoolId: null },
      { problemNumber: 3, schoolId: null },
    ]);
  });

  it('maps a unique-violation from the DB to 409', async () => {
    const { useCase, usersRepo } = setUp();
    jest.spyOn(usersRepo, 'create').mockRejectedValue(sqlError(2627));
    await expect(
      useCase.create({ username: 'dup', displayName: 'x', password: 'password123', problemNumbers: [1] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('re-throws unknown errors untouched', async () => {
    const { useCase, usersRepo } = setUp();
    const boom = new Error('boom');
    jest.spyOn(usersRepo, 'create').mockRejectedValue(boom);
    await expect(
      useCase.create({ username: 'x', displayName: 'x', password: 'password123', problemNumbers: [1] }),
    ).rejects.toBe(boom);
  });

  it('update replaces assignments and/or password independently', async () => {
    const { useCase, usersRepo, assignmentRepo } = setUp();
    usersRepo.seed(makeUser({ id: 'u', passwordHash: 'old' }));
    assignmentRepo.seed('u', [1]);

    await useCase.update('u', { problemNumbers: [2, 4] });
    expect((await assignmentRepo.findProblemNumbersByUser('u')).sort()).toEqual([2, 4]);
    expect((await usersRepo.findById('u'))?.passwordHash).toBe('old');

    await useCase.update('u', { password: 'newpassword1' });
    expect(await bcrypt.compare('newpassword1', (await usersRepo.findById('u'))!.passwordHash)).toBe(true);
    expect((await assignmentRepo.findProblemNumbersByUser('u')).sort()).toEqual([2, 4]);
  });

  it('remove: 404 unknown, 403 for ADMIN, 409 on FK violation, success otherwise', async () => {
    const { useCase, usersRepo } = setUp();
    await expect(useCase.remove('nope')).rejects.toBeInstanceOf(NotFoundException);

    usersRepo.seed(makeUser({ id: 'a', role: 'ADMIN' }));
    await expect(useCase.remove('a')).rejects.toBeInstanceOf(ForbiddenException);

    usersRepo.seed(makeUser({ id: 'c' }));
    jest.spyOn(usersRepo, 'delete').mockRejectedValueOnce(sqlError(547));
    await expect(useCase.remove('c')).rejects.toBeInstanceOf(ConflictException);

    await useCase.remove('c');
    expect(await usersRepo.findById('c')).toBeNull();
  });
});

describe('ManageQueueUseCase', () => {
  it('create: appends after the problem’s existing items; 409 for a duplicate school+problem', async () => {
    const queueRepo = new FakeQueueRepository();
    queueRepo.seed(makeQueueItem({ id: 'a', schoolId: 's1', problemNumber: 1, position: 0 }));
    queueRepo.seed(makeQueueItem({ id: 'b', schoolId: 's2', problemNumber: 1, position: 1 }));
    const useCase = new ManageQueueUseCase(queueRepo);

    const created = await useCase.create('s3', 1);
    expect(created).toMatchObject({ schoolId: 's3', problemNumber: 1, position: 2, status: 'WAITING' });
    await expect(useCase.create('s1', 1)).rejects.toBeInstanceOf(ConflictException);
  });

  it('move swaps positions with the neighbour inside the same problem only', async () => {
    const queueRepo = new FakeQueueRepository();
    queueRepo.seed(makeQueueItem({ id: 'a', schoolId: 's1', problemNumber: 1, position: 0 }));
    queueRepo.seed(makeQueueItem({ id: 'b', schoolId: 's2', problemNumber: 1, position: 1 }));
    queueRepo.seed(makeQueueItem({ id: 'z', schoolId: 's1', problemNumber: 2, position: 1 }));
    const useCase = new ManageQueueUseCase(queueRepo);

    await useCase.move('a', 'down');
    expect((await queueRepo.findById('a'))?.position).toBe(1);
    expect((await queueRepo.findById('b'))?.position).toBe(0);
    expect((await queueRepo.findById('z'))?.position).toBe(1);
  });

  it('move at a boundary is a no-op; unknown id is 404', async () => {
    const queueRepo = new FakeQueueRepository();
    queueRepo.seed(makeQueueItem({ id: 'a', position: 0 }));
    const useCase = new ManageQueueUseCase(queueRepo);
    await useCase.move('a', 'up');
    await useCase.move('a', 'down');
    expect((await queueRepo.findById('a'))?.position).toBe(0);
    await expect(useCase.move('nope', 'up')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('setScheduledTime edits a WAITING item (Bangkok time), keeps position; 409 if started, 404 if unknown', async () => {
    const queueRepo = new FakeQueueRepository();
    queueRepo.seed(makeQueueItem({ id: 'a', position: 3 }));
    queueRepo.seed(makeQueueItem({ id: 'b', status: 'IN_PROGRESS' }));
    const useCase = new ManageQueueUseCase(queueRepo);

    await useCase.setScheduledTime('a', '2026-05-17', '14:45');
    const a = await queueRepo.findById('a');
    expect(a?.position).toBe(3);
    expect(new Date(a!.scheduledAt!).toISOString()).toBe('2026-05-17T07:45:00.000Z');
    await expect(useCase.setScheduledTime('b', '2026-05-17', '14:45')).rejects.toBeInstanceOf(ConflictException);
    await expect(useCase.setScheduledTime('nope', '2026-05-17', '14:45')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove deletes the item', async () => {
    const queueRepo = new FakeQueueRepository();
    queueRepo.seed(makeQueueItem({ id: 'a' }));
    await new ManageQueueUseCase(queueRepo).remove('a');
    expect(await queueRepo.findById('a')).toBeNull();
  });
});

describe('ManageSchoolsUseCase', () => {
  it('create/update map unique violations to 409', async () => {
    const repo = new FakeSchoolsRepository();
    const useCase = new ManageSchoolsUseCase(repo);
    const school = await useCase.create({ name: 'A', code: 'A' });
    expect(school.name).toBe('A');

    jest.spyOn(repo, 'create').mockRejectedValueOnce(sqlError(2601));
    await expect(useCase.create({ name: 'A', code: null })).rejects.toBeInstanceOf(ConflictException);
    jest.spyOn(repo, 'update').mockRejectedValueOnce(sqlError(2627));
    await expect(useCase.update(school.id, { name: 'A', code: null })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('update of an unknown school is 404 (real DB returns no row)', async () => {
    const useCase = new ManageSchoolsUseCase(new FakeSchoolsRepository());
    await expect(useCase.update('ghost', { name: 'x', code: null })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update changes fields', async () => {
    const repo = new FakeSchoolsRepository();
    const useCase = new ManageSchoolsUseCase(repo);
    const school = await useCase.create({ name: 'A', code: 'A' });
    expect(await useCase.update(school.id, { name: 'B', code: 'B' })).toMatchObject({ name: 'B', code: 'B' });
  });

  it('remove refuses a school that still has queue items, deletes otherwise', async () => {
    const repo = new FakeSchoolsRepository();
    const useCase = new ManageSchoolsUseCase(repo);
    const school = await useCase.create({ name: 'A', code: 'A' });

    jest.spyOn(repo, 'hasQueueItems').mockResolvedValueOnce(true);
    await expect(useCase.remove(school.id)).rejects.toBeInstanceOf(ConflictException);
    expect(await repo.findById(school.id)).not.toBeNull();

    await useCase.remove(school.id);
    expect(await repo.findById(school.id)).toBeNull();
  });
});

describe('GetDashboardUseCase', () => {
  it('aggregates counts, fully-scored schools, pending edit requests, stale items and lock state', async () => {
    const queueRepo = new FakeQueueRepository();
    // school-1: all DONE -> fully scored; school-2: one WAITING -> not.
    queueRepo.seed(makeQueueItem({ id: 'a', schoolId: 's1', problemNumber: 1, status: 'DONE' }));
    queueRepo.seed(makeQueueItem({ id: 'b', schoolId: 's1', problemNumber: 2, status: 'DONE' }));
    queueRepo.seed(makeQueueItem({ id: 'c', schoolId: 's2', problemNumber: 1, status: 'DONE' }));
    queueRepo.seed(
      makeQueueItem({
        id: 'd',
        schoolId: 's2',
        problemNumber: 2,
        status: 'IN_PROGRESS',
        claimedByUserId: 'j',
        claimedAt: new Date(Date.now() - 45 * 60_000),
      }),
    );
    const schools = new FakeSchoolsRepository();
    schools.seed({ id: 's1', name: 'A', code: 'A' });
    schools.seed({ id: 's2', name: 'B', code: 'B' });
    const students = new FakeStudentsRepository();
    students.seed(makeStudent({ id: 'st1', schoolId: 's1' }));
    const users = new FakeUsersRepository();
    users.seed(makeUser({ id: 'c1', role: 'COMMITTEE' }));
    users.seed(makeUser({ id: 'c2', role: 'COMMITTEE' }));
    users.seed(makeUser({ id: 'staff', role: 'STAFF' }));
    const edits = new FakeScoreEditRequestsRepository();
    await edits.create({ scoreId: 'x', requestedBy: 'c1', oldValue: 1, newValue: 2, reason: 'r' });
    const settings = new FakeSettingsRepository();
    settings.seed({ scoringLocked: true });

    const result = await new GetDashboardUseCase(queueRepo, schools, students, users, edits, settings).execute();

    expect(result.queueCounts).toEqual({ waiting: 0, inProgress: 1, done: 3, total: 4 });
    expect(result.schoolCount).toBe(2);
    expect(result.committeeCount).toBe(2); // STAFF is not committee
    expect(result.studentCount).toBe(1);
    expect(result.schoolsFullyScored).toBe(1);
    expect(result.pendingEditRequestCount).toBe(1);
    expect(result.staleItems.map((i) => i.id)).toEqual(['d']);
    expect(result.scoringLocked).toBe(true);
  });
});

describe('ListCommitteeUseCase / ListStaffUseCase', () => {
  it('list only their own role, with the right scope shape', async () => {
    const users = new FakeUsersRepository();
    const assignments = new FakeUserAssignmentRepository();
    users.seed(makeUser({ id: 'c', role: 'COMMITTEE', username: 'c', displayName: 'C' }));
    users.seed(makeUser({ id: 's', role: 'STAFF', username: 's', displayName: 'S' }));
    assignments.seed('c', [1, 2]);
    assignments.seedScope('s', [{ problemNumber: 4, schoolId: 'sch' }]);

    expect(await new ListCommitteeUseCase(users, assignments).execute()).toEqual([
      { id: 'c', username: 'c', displayName: 'C', problemNumbers: [1, 2] },
    ]);
    expect(await new ListStaffUseCase(users, assignments).execute()).toEqual([
      { id: 's', username: 's', displayName: 'S', assignments: [{ problemNumber: 4, schoolId: 'sch' }] },
    ]);
  });
});

describe('UploadSignatureUseCase', () => {
  const setUp = () => {
    const users = new FakeUsersRepository();
    const storage = new FakeFileStorage();
    users.seed(makeUser({ id: 'u1' }));
    return { users, storage, useCase: new UploadSignatureUseCase(users, storage) };
  };

  it('stores png/jpg/jpeg (any case) and records the path', async () => {
    for (const name of ['a.png', 'a.JPG', 'a.jpeg']) {
      const { users, storage, useCase } = setUp();
      const { signaturePath } = await useCase.execute({
        userId: 'u1',
        originalname: name,
        buffer: Buffer.from('img'),
      });
      expect(storage.signatures.get(signaturePath)?.toString()).toBe('img');
      expect((await users.findById('u1'))?.signaturePath).toBe(signaturePath);
    }
  });

  it('rejects other extensions (400) and unknown users (404) without writing anything', async () => {
    const { storage, useCase } = setUp();
    await expect(
      useCase.execute({ userId: 'u1', originalname: 'a.gif', buffer: Buffer.from('x') }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      useCase.execute({ userId: 'ghost', originalname: 'a.png', buffer: Buffer.from('x') }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.signatures.size).toBe(0);
  });
});
