import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ManageStaffAssignmentsUseCase } from './manage-staff.use-case';
import { FakeUsersRepository } from '../../../testing/fake-users.repository';
import { FakeUserAssignmentRepository } from '../../../testing/fake-user-assignment.repository';
import { AppConfig } from '../../../config/configuration';

function setUp() {
  const usersRepo = new FakeUsersRepository();
  const assignmentRepo = new FakeUserAssignmentRepository();
  // Minimal stub — only `bcryptSaltRounds` is ever read by this use-case.
  const configService = { get: () => 4 } as unknown as ConfigService<AppConfig, true>;
  const useCase = new ManageStaffAssignmentsUseCase(usersRepo, assignmentRepo, configService);
  return { useCase, usersRepo, assignmentRepo };
}

describe('ManageStaffAssignmentsUseCase — assignment de-dup (SPEC-driven refactor, B4)', () => {
  it('rejects creating a STAFF account with two identical (problemNumber, schoolId) assignment rows', async () => {
    const { useCase } = setUp();

    await expect(
      useCase.create({
        username: 'staff1',
        displayName: 'Staff One',
        password: 'password123',
        assignments: [
          { problemNumber: 1, schoolId: 'school-1' },
          { problemNumber: 1, schoolId: 'school-1' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects two null-school (every-school) rows for the same problem number — the case the DB’s plain UNIQUE constraint cannot catch', async () => {
    const { useCase } = setUp();

    await expect(
      useCase.create({
        username: 'staff1',
        displayName: 'Staff One',
        password: 'password123',
        assignments: [
          { problemNumber: 1, schoolId: null },
          { problemNumber: 1, schoolId: null },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts distinct (problemNumber, schoolId) rows, including one null-school row per problem number', async () => {
    const { useCase, assignmentRepo } = setUp();

    const { id } = await useCase.create({
      username: 'staff1',
      displayName: 'Staff One',
      password: 'password123',
      assignments: [
        { problemNumber: 1, schoolId: 'school-1' },
        { problemNumber: 1, schoolId: 'school-2' },
        { problemNumber: 2, schoolId: null },
      ],
    });

    expect(await assignmentRepo.findScopeByUser(id)).toHaveLength(3);
  });

  it('validates the new assignment set on update too, before any repository write', async () => {
    const { useCase, assignmentRepo } = setUp();
    const { id } = await useCase.create({
      username: 'staff1',
      displayName: 'Staff One',
      password: 'password123',
      assignments: [{ problemNumber: 1, schoolId: 'school-1' }],
    });

    await expect(
      useCase.update(id, {
        assignments: [
          { problemNumber: 2, schoolId: null },
          { problemNumber: 2, schoolId: null },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(await assignmentRepo.findScopeByUser(id)).toEqual([
      { problemNumber: 1, schoolId: 'school-1' },
    ]);
  });
});
