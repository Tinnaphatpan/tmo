import { Executor } from '../../database/types';

export abstract class CommitteeAssignmentRepository {
  abstract findProblemNumbersByUser(userId: string, executor?: Executor): Promise<number[]>;
  /** Replaces the full assignment set for a user in one go (admin PATCH, SPEC §2.5). */
  abstract replaceForUser(userId: string, problemNumbers: number[], executor?: Executor): Promise<void>;
  abstract deleteForUser(userId: string, executor?: Executor): Promise<void>;
}
