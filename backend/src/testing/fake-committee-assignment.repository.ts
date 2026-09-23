import { CommitteeAssignmentRepository } from '../modules/committee/committee-assignment.repository';

export class FakeCommitteeAssignmentRepository extends CommitteeAssignmentRepository {
  private readonly assignments = new Map<string, number[]>();

  seed(userId: string, problemNumbers: number[]): void {
    this.assignments.set(userId, problemNumbers);
  }

  async findProblemNumbersByUser(userId: string): Promise<number[]> {
    return this.assignments.get(userId) ?? [];
  }

  async replaceForUser(userId: string, problemNumbers: number[]): Promise<void> {
    this.assignments.set(userId, problemNumbers);
  }

  async deleteForUser(userId: string): Promise<void> {
    this.assignments.delete(userId);
  }
}
