import { Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DB_POOL } from '../../database/database.tokens';
import { Executor, request } from '../../database/types';
import { CommitteeAssignmentRepository } from './committee-assignment.repository';

@Injectable()
export class MssqlCommitteeAssignmentRepository extends CommitteeAssignmentRepository {
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
        'SELECT ProblemNumber FROM CommitteeAssignment WHERE UserId = @userId ORDER BY ProblemNumber',
      );
    return result.recordset.map((r) => r.ProblemNumber);
  }

  async replaceForUser(userId: string, problemNumbers: number[], executor?: Executor): Promise<void> {
    const exec = this.exec(executor);
    await request(exec)
      .input('userId', sql.UniqueIdentifier, userId)
      .query('DELETE FROM CommitteeAssignment WHERE UserId = @userId');

    for (const problemNumber of problemNumbers) {
      await request(exec)
        .input('userId', sql.UniqueIdentifier, userId)
        .input('problemNumber', sql.Int, problemNumber)
        .query(
          'INSERT INTO CommitteeAssignment (UserId, ProblemNumber) VALUES (@userId, @problemNumber)',
        );
    }
  }

  async deleteForUser(userId: string, executor?: Executor): Promise<void> {
    await request(this.exec(executor))
      .input('userId', sql.UniqueIdentifier, userId)
      .query('DELETE FROM CommitteeAssignment WHERE UserId = @userId');
  }
}
