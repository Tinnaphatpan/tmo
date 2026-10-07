import { Role, ScoreEditRequest } from '../../domain/entities';
import { Executor } from '../../database/types';

/**
 * The old value is not an input: it is the Score's value at request time and
 * is recorded in the SCORE_EDIT_REQUESTED audit entry, not on this row.
 */
export interface CreateScoreEditRequestInput {
  scoreId: string;
  requestedBy: string;
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
  /** Returns the row without oldValue: that is read from the audit trail, not stored here. */
  abstract create(
    input: CreateScoreEditRequestInput,
    executor?: Executor,
  ): Promise<Omit<ScoreEditRequest, 'oldValue'>>;
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
