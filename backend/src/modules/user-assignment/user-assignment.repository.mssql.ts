import { Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DB_POOL } from '../../database/database.tokens';
import { Executor, request } from '../../database/types';
import { UserAssignmentRepository, UserAssignmentScope } from './user-assignment.repository';

@Injectable()
export class MssqlUserAssignmentRepository extends UserAssignmentRepository {
  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {
    super();
  }

  private exec(executor?: Executor): Executor {
    return executor ?? this.pool;
  }

  async findProblemNumbersByUser(userId: string, executor?: Executor): Promise<number[]> {
    const result = await request(this.exec(executor))
      .input('userId', sql.UniqueIdentifier, userId)
      .query<{ ProblemNumber: number }>(
        'SELECT ProblemNumber FROM UserAssignment WHERE UserId = @userId ORDER BY ProblemNumber',
      );
    return result.recordset.map((r) => r.ProblemNumber);
  }

  async findScopeByUser(userId: string, executor?: Executor): Promise<UserAssignmentScope[]> {
    const result = await request(this.exec(executor))
      .input('userId', sql.UniqueIdentifier, userId)
      .query<{ ProblemNumber: number; SchoolId: string | null }>(
        'SELECT ProblemNumber, SchoolId FROM UserAssignment WHERE UserId = @userId ORDER BY ProblemNumber',
      );
    return result.recordset.map((r) => ({ problemNumber: r.ProblemNumber, schoolId: r.SchoolId }));
  }

  async replaceForUser(
    userId: string,
    assignments: UserAssignmentScope[],
    executor?: Executor,
  ): Promise<void> {
    const exec = this.exec(executor);
    await request(exec)
      .input('userId', sql.UniqueIdentifier, userId)
      .query('DELETE FROM UserAssignment WHERE UserId = @userId');

    for (const { problemNumber, schoolId } of assignments) {
      await request(exec)
        .input('userId', sql.UniqueIdentifier, userId)
        .input('problemNumber', sql.Int, problemNumber)
        .input('schoolId', sql.UniqueIdentifier, schoolId)
        .query(
          'INSERT INTO UserAssignment (UserId, ProblemNumber, SchoolId) VALUES (@userId, @problemNumber, @schoolId)',
        );
    }
  }

  async deleteForUser(userId: string, executor?: Executor): Promise<void> {
    await request(this.exec(executor))
      .input('userId', sql.UniqueIdentifier, userId)
      .query('DELETE FROM UserAssignment WHERE UserId = @userId');
  }
}
