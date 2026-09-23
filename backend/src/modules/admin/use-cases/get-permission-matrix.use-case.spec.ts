import { GetPermissionMatrixUseCase } from './get-permission-matrix.use-case';
import { FakeUsersRepository, makeUser } from '../../../testing/fake-users.repository';
import { FakeUserAssignmentRepository } from '../../../testing/fake-user-assignment.repository';

describe('GetPermissionMatrixUseCase (B6)', () => {
  it('returns committee, staff and team leaders with their scope, excluding admins', async () => {
    const usersRepo = new FakeUsersRepository();
    const assignmentRepo = new FakeUserAssignmentRepository();
    for (const u of [
      makeUser({ id: 'a', role: 'ADMIN' }),
      makeUser({ id: 'c', role: 'COMMITTEE' }),
      makeUser({ id: 's', role: 'STAFF' }),
      makeUser({ id: 't', role: 'TEAM_LEADER', schoolId: 'school-1', signaturePath: 'sig.png' }),
    ]) usersRepo.seed(u);
    assignmentRepo.seed('c', [1, 2]);
    assignmentRepo.seedScope('s', [{ problemNumber: 3, schoolId: 'school-1' }]);

    const rows = await new GetPermissionMatrixUseCase(usersRepo, assignmentRepo).execute();

    expect(rows.map((r) => r.id).sort()).toEqual(['c', 's', 't']);
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(by.c.assignments).toEqual([
      { problemNumber: 1, schoolId: null },
      { problemNumber: 2, schoolId: null },
    ]);
    expect(by.s.assignments).toEqual([{ problemNumber: 3, schoolId: 'school-1' }]);
    expect(by.t).toMatchObject({ schoolId: 'school-1', hasSignature: true, assignments: [] });
    expect(by.c.hasSignature).toBe(false);
  });
});
