import { Executor } from '../../database/types';

export interface UserAssignmentScope {
  problemNumber: number;
  schoolId: string | null;
}

export abstract class UserAssignmentRepository {
  /** COMMITTEE scoping: which problem numbers (any school) this user may claim. */
  abstract findProblemNumbersByUser(userId: string, executor?: Executor): Promise<number[]>;
  /** STAFF scoping: full (problemNumber, schoolId) scope — schoolId null = all schools. */
  abstract findScopeByUser(userId: string, executor?: Executor): Promise<UserAssignmentScope[]>;
  /** Replaces the full assignment set for a user in one go (admin PATCH, SPEC §2.5). */
  abstract replaceForUser(
    userId: string,
    assignments: UserAssignmentScope[],
    executor?: Executor,
  ): Promise<void>;
  abstract deleteForUser(userId: string, executor?: Executor): Promise<void>;
}
