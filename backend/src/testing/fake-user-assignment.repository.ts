import {
  UserAssignmentRepository,
  UserAssignmentScope,
} from '../modules/user-assignment/user-assignment.repository';

export class FakeUserAssignmentRepository extends UserAssignmentRepository {
  private readonly assignments = new Map<string, UserAssignmentScope[]>();

  /** Convenience seed for COMMITTEE-shaped tests: problem numbers, all schools. */
  seed(userId: string, problemNumbers: number[]): void {
    this.assignments.set(
      userId,
      problemNumbers.map((problemNumber) => ({ problemNumber, schoolId: null })),
    );
  }

  seedScope(userId: string, scope: UserAssignmentScope[]): void {
    this.assignments.set(userId, scope);
  }

  async findProblemNumbersByUser(userId: string): Promise<number[]> {
    return (this.assignments.get(userId) ?? []).map((a) => a.problemNumber);
  }

  async findScopeByUser(userId: string): Promise<UserAssignmentScope[]> {
    return this.assignments.get(userId) ?? [];
  }

  async replaceForUser(userId: string, assignments: UserAssignmentScope[]): Promise<void> {
    this.assignments.set(userId, assignments);
  }

  async deleteForUser(userId: string): Promise<void> {
    this.assignments.delete(userId);
  }
}
