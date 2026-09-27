import { Role, ScoreEditRequest } from '../../domain/entities';
import { Executor } from '../../database/types';

export interface CreateScoreEditRequestInput {
  scoreId: string;
  requestedBy: string;
  oldValue: number;
  newValue: number;
  reason: string;
}

export interface ScoreEditRequestWithContext extends ScoreEditRequest {
  schoolName: string;
  studentName: string;
  studentCode: string;
  problemNumber: number;
  requestedByDisplayName: string;
  /** Role of the requester: TEAM_LEADER requests are reviewed by the problem's judge, everything else by the team leader. */
  requestedByRole: Role;
  schoolId: string;
}

export abstract class ScoreEditRequestsRepository {
  abstract create(input: CreateScoreEditRequestInput, executor?: Executor): Promise<ScoreEditRequest>;
  abstract findById(id: string, executor?: Executor): Promise<ScoreEditRequest | null>;
  abstract findAllWithContext(executor?: Executor): Promise<ScoreEditRequestWithContext[]>;
  abstract findBySchoolWithContext(
    schoolId: string,
    executor?: Executor,
  ): Promise<ScoreEditRequestWithContext[]>;
  abstract updateStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewedBy: string,
    executor?: Executor,
  ): Promise<ScoreEditRequest>;
}
