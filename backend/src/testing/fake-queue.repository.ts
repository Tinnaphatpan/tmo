import { QueueItem } from '../domain/entities';
import {
  ProblemCounts,
  QueueItemWithSchool,
  QueueRepository,
  StatusCounts,
} from '../modules/queue/queue.repository';

/**
 * In-memory QueueRepository for Use Case unit tests (no DB needed — see
 * README note on why this sandbox can't reach a real MSSQL server).
 * `claim()` deliberately performs its check-and-set synchronously with no
 * `await` before the mutation, so two concurrent `execute()` calls racing
 * via Promise.all genuinely exercise the same all-or-nothing semantics the
 * real `UPDATE ... WHERE Status='WAITING' AND ClaimedByUserId IS NULL` has.
 */
export class FakeQueueRepository extends QueueRepository {
  readonly items: QueueItem[] = [];

  seed(item: QueueItem): void {
    this.items.push(item);
  }

  async findAllWithSchool(): Promise<QueueItemWithSchool[]> {
    return this.items.map((i) => ({ ...i, schoolName: 'x', schoolCode: null }));
  }

  async findByProblemNumbersWithSchool(problemNumbers: number[]): Promise<QueueItemWithSchool[]> {
    return this.items
      .filter((i) => problemNumbers.includes(i.problemNumber))
      .map((i) => ({ ...i, schoolName: 'x', schoolCode: null }));
  }

  async findById(id: string): Promise<QueueItem | null> {
    return this.items.find((i) => i.id === id) ?? null;
  }

  async findByIdWithSchool(id: string): Promise<QueueItemWithSchool | null> {
    const item = this.items.find((i) => i.id === id);
    return item ? { ...item, schoolName: 'x', schoolCode: null } : null;
  }

  async findActiveClaimByUser(userId: string): Promise<QueueItem | null> {
    return (
      this.items.find((i) => i.claimedByUserId === userId && i.status === 'IN_PROGRESS') ?? null
    );
  }

  async findAwaitingApprovalBySubmitter(userId: string): Promise<QueueItem | null> {
    return (
      this.items.find(
        (i) =>
          i.submittedByUserId === userId && i.status === 'DONE' && i.approvalStatus === 'PENDING',
      ) ?? null
    );
  }

  // No `await` before the mutation — see class doc comment.
  async claim(id: string, userId: string): Promise<boolean> {
    const item = this.items.find((i) => i.id === id);
    if (!item || item.status !== 'WAITING' || item.claimedByUserId !== null) {
      return false;
    }
    item.status = 'IN_PROGRESS';
    item.claimedByUserId = userId;
    item.claimedAt = new Date();
    return true;
  }

  async release(id: string): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    item.status = 'WAITING';
    item.claimedByUserId = null;
    item.claimedAt = null;
  }

  async markPendingApproval(id: string, submittedByUserId: string): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    item.status = 'DONE';
    item.completedAt = new Date();
    item.approvalStatus = 'PENDING';
    item.submittedByUserId = submittedByUserId;
  }

  async approve(id: string, approvedByUserId: string, documentPath: string | null): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    item.approvalStatus = 'APPROVED';
    item.approvedByUserId = approvedByUserId;
    item.approvedAt = new Date();
    item.documentPath = documentPath;
  }

  async updateDocumentPath(id: string, documentPath: string): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (item) item.documentPath = documentPath;
  }

  async findPendingApprovalBySchool(schoolId: string): Promise<QueueItemWithSchool[]> {
    return this.items
      .filter((i) => i.schoolId === schoolId && i.approvalStatus === 'PENDING')
      .map((i) => ({ ...i, schoolName: 'x', schoolCode: null }));
  }

  async create(input: {
    schoolId: string;
    problemNumber: number;
    position: number;
    scheduledAt: Date | null;
  }): Promise<QueueItem> {
    const item: QueueItem = {
      id: `queue-${this.items.length + 1}`,
      schoolId: input.schoolId,
      problemNumber: input.problemNumber,
      status: 'WAITING',
      position: input.position,
      scheduledAt: input.scheduledAt,
      claimedByUserId: null,
      claimedAt: null,
      completedAt: null,
      submittedByUserId: null,
      approvalStatus: 'NOT_SUBMITTED',
      approvedByUserId: null,
      approvedAt: null,
      documentPath: null,
    };
    this.items.push(item);
    return item;
  }

  async updatePosition(id: string, position: number): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (item) item.position = position;
  }

  async updateSchedule(id: string, position: number, scheduledAt: Date): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (item) {
      item.position = position;
      item.scheduledAt = scheduledAt;
    }
  }

  async delete(id: string): Promise<void> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index >= 0) this.items.splice(index, 1);
  }

  async findStaleInProgress(thresholdMinutes: number): Promise<QueueItemWithSchool[]> {
    const now = Date.now();
    return this.items
      .filter(
        (i) =>
          i.status === 'IN_PROGRESS' &&
          i.claimedAt &&
          now - i.claimedAt.getTime() >= thresholdMinutes * 60_000,
      )
      .map((i) => ({ ...i, schoolName: 'x', schoolCode: null }));
  }

  async countByStatus(): Promise<StatusCounts> {
    const counts: StatusCounts = { waiting: 0, inProgress: 0, done: 0, total: this.items.length };
    for (const i of this.items) {
      if (i.status === 'WAITING') counts.waiting++;
      if (i.status === 'IN_PROGRESS') counts.inProgress++;
      if (i.status === 'DONE') counts.done++;
    }
    return counts;
  }

  async countByProblem(): Promise<ProblemCounts[]> {
    const byProblem = new Map<number, ProblemCounts>();
    for (const i of this.items) {
      const entry = byProblem.get(i.problemNumber) ?? {
        problemNumber: i.problemNumber,
        total: 0,
        done: 0,
        inProgress: 0,
      };
      entry.total++;
      if (i.status === 'DONE') entry.done++;
      if (i.status === 'IN_PROGRESS') entry.inProgress++;
      byProblem.set(i.problemNumber, entry);
    }
    return [...byProblem.values()].sort((a, b) => a.problemNumber - b.problemNumber);
  }

  async existsForSchoolAndProblem(schoolId: string, problemNumber: number): Promise<boolean> {
    return this.items.some((i) => i.schoolId === schoolId && i.problemNumber === problemNumber);
  }
}

export function makeQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'queue-1',
    schoolId: 'school-1',
    problemNumber: 1,
    status: 'WAITING',
    position: 0,
    scheduledAt: null,
    claimedByUserId: null,
    claimedAt: null,
    completedAt: null,
    submittedByUserId: null,
    approvalStatus: 'NOT_SUBMITTED',
    approvedByUserId: null,
    approvedAt: null,
    documentPath: null,
    ...overrides,
  };
}
