import { ScoreEditRequest } from '../domain/entities';
import {
  CreateScoreEditRequestInput,
  ScoreEditRequestsRepository,
  ScoreEditRequestWithContext,
} from '../modules/scores/score-edit-requests.repository';

export class FakeScoreEditRequestsRepository extends ScoreEditRequestsRepository {
  readonly requests: ScoreEditRequest[] = [];

  async create(input: CreateScoreEditRequestInput): Promise<ScoreEditRequest> {
    const req: ScoreEditRequest = {
      id: `edit-${this.requests.length + 1}`,
      scoreId: input.scoreId,
      requestedBy: input.requestedBy,
      oldValue: input.oldValue,
      newValue: input.newValue,
      reason: input.reason,
      status: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
    };
    this.requests.push(req);
    return req;
  }

  async findById(id: string): Promise<ScoreEditRequest | null> {
    return this.requests.find((r) => r.id === id) ?? null;
  }

  async findAllWithContext(): Promise<ScoreEditRequestWithContext[]> {
    return this.requests.map((r) => ({
      ...r,
      schoolName: 'x',
      studentName: 'x',
      studentCode: 'x',
      problemNumber: 1,
      requestedByDisplayName: 'x',
    }));
  }

  async updateStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewedBy: string,
  ): Promise<ScoreEditRequest> {
    const req = this.requests.find((r) => r.id === id);
    if (!req) throw new Error('not found');
    req.status = status;
    req.reviewedBy = reviewedBy;
    req.reviewedAt = new Date();
    return req;
  }
}
