import { Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DB_POOL } from '../../database/database.tokens';
import { Executor, request } from '../../database/types';
import { QueueItem } from '../../domain/entities';
import {
  ProblemCounts,
  QueueItemWithSchool,
  QueueRepository,
  StatusCounts,
} from './queue.repository';

interface QueueItemRow {
  Id: string;
  SchoolId: string;
  ProblemNumber: number;
  Status: QueueItem['status'];
  Position: number;
  ScheduledAt: Date | null;
  ClaimedByUserId: string | null;
  ClaimedAt: Date | null;
  CompletedAt: Date | null;
  SubmittedByUserId: string | null;
  ApprovalStatus: QueueItem['approvalStatus'];
  ApprovedByUserId: string | null;
  ApprovedAt: Date | null;
  DocumentPath: string | null;
}

interface QueueItemWithSchoolRow extends QueueItemRow {
  SchoolName: string;
  SchoolCode: string | null;
}

const QUEUE_ITEM_COLUMNS = `
  q.Id, q.SchoolId, q.ProblemNumber, q.Status, q.Position, q.ScheduledAt,
  q.ClaimedByUserId, q.ClaimedAt, q.CompletedAt,
  q.SubmittedByUserId, q.ApprovalStatus, q.ApprovedByUserId, q.ApprovedAt, q.DocumentPath
`;

function toEntity(row: QueueItemRow): QueueItem {
  return {
    id: row.Id,
    schoolId: row.SchoolId,
    problemNumber: row.ProblemNumber,
    status: row.Status,
    position: row.Position,
    scheduledAt: row.ScheduledAt,
    claimedByUserId: row.ClaimedByUserId,
    claimedAt: row.ClaimedAt,
    completedAt: row.CompletedAt,
    submittedByUserId: row.SubmittedByUserId,
    approvalStatus: row.ApprovalStatus,
    approvedByUserId: row.ApprovedByUserId,
    approvedAt: row.ApprovedAt,
    documentPath: row.DocumentPath,
  };
}

function toEntityWithSchool(row: QueueItemWithSchoolRow): QueueItemWithSchool {
  return { ...toEntity(row), schoolName: row.SchoolName, schoolCode: row.SchoolCode };
}

const SELECT_WITH_SCHOOL = `
  SELECT ${QUEUE_ITEM_COLUMNS},
         s.Name AS SchoolName, s.Code AS SchoolCode
  FROM QueueItem q
  JOIN School s ON s.Id = q.SchoolId
`;

@Injectable()
export class MssqlQueueRepository extends QueueRepository {
  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {
    super();
  }

  private exec(executor?: Executor): Executor {
    return executor ?? this.pool;
  }

  async findAllWithSchool(executor?: Executor): Promise<QueueItemWithSchool[]> {
    const result = await request(this.exec(executor)).query<QueueItemWithSchoolRow>(
      `${SELECT_WITH_SCHOOL} ORDER BY q.ProblemNumber, q.Position`,
    );
    return result.recordset.map(toEntityWithSchool);
  }

  async findByProblemNumbersWithSchool(
    problemNumbers: number[],
    executor?: Executor,
  ): Promise<QueueItemWithSchool[]> {
    if (problemNumbers.length === 0) return [];
    const req = request(this.exec(executor));
    const placeholders = problemNumbers.map((p, i) => {
      req.input(`p${i}`, sql.Int, p);
      return `@p${i}`;
    });
    const result = await req.query<QueueItemWithSchoolRow>(
      `${SELECT_WITH_SCHOOL} WHERE q.ProblemNumber IN (${placeholders.join(',')}) ORDER BY q.ProblemNumber, q.Position`,
    );
    return result.recordset.map(toEntityWithSchool);
  }

  async findById(id: string, executor?: Executor): Promise<QueueItem | null> {
    const result = await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query<QueueItemRow>(`SELECT ${QUEUE_ITEM_COLUMNS} FROM QueueItem q WHERE q.Id = @id`);
    return result.recordset[0] ? toEntity(result.recordset[0]) : null;
  }

  async findByIdWithSchool(id: string, executor?: Executor): Promise<QueueItemWithSchool | null> {
    const result = await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query<QueueItemWithSchoolRow>(`${SELECT_WITH_SCHOOL} WHERE q.Id = @id`);
    return result.recordset[0] ? toEntityWithSchool(result.recordset[0]) : null;
  }

  async findActiveClaimByUser(userId: string, executor?: Executor): Promise<QueueItem | null> {
    const result = await request(this.exec(executor))
      .input('userId', sql.UniqueIdentifier, userId)
      .query<QueueItemRow>(
        `SELECT ${QUEUE_ITEM_COLUMNS} FROM QueueItem q WHERE q.ClaimedByUserId = @userId AND q.Status = 'IN_PROGRESS'`,
      );
    return result.recordset[0] ? toEntity(result.recordset[0]) : null;
  }

  async claim(id: string, userId: string, executor?: Executor): Promise<boolean> {
    const result = await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE QueueItem
        SET Status = 'IN_PROGRESS', ClaimedByUserId = @userId, ClaimedAt = SYSUTCDATETIME()
        WHERE Id = @id AND Status = 'WAITING' AND ClaimedByUserId IS NULL
      `);
    return (result.rowsAffected[0] ?? 0) > 0;
  }

  async release(id: string, executor?: Executor): Promise<void> {
    await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE QueueItem
        SET Status = 'WAITING', ClaimedByUserId = NULL, ClaimedAt = NULL
        WHERE Id = @id
      `);
  }

  async markPendingApproval(
    id: string,
    submittedByUserId: string,
    executor: Executor,
  ): Promise<void> {
    await request(executor)
      .input('id', sql.UniqueIdentifier, id)
      .input('submittedByUserId', sql.UniqueIdentifier, submittedByUserId)
      .query(`
        UPDATE QueueItem
        SET Status = 'DONE', CompletedAt = SYSUTCDATETIME(),
            ApprovalStatus = 'PENDING', SubmittedByUserId = @submittedByUserId
        WHERE Id = @id
      `);
  }

  async approve(
    id: string,
    approvedByUserId: string,
    documentPath: string | null,
    executor: Executor,
  ): Promise<void> {
    await request(executor)
      .input('id', sql.UniqueIdentifier, id)
      .input('approvedByUserId', sql.UniqueIdentifier, approvedByUserId)
      .input('documentPath', sql.NVarChar, documentPath)
      .query(`
        UPDATE QueueItem
        SET ApprovalStatus = 'APPROVED', ApprovedByUserId = @approvedByUserId,
            ApprovedAt = SYSUTCDATETIME(), DocumentPath = @documentPath
        WHERE Id = @id
      `);
  }

  async updateDocumentPath(id: string, documentPath: string, executor?: Executor): Promise<void> {
    await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .input('documentPath', sql.NVarChar, documentPath)
      .query('UPDATE QueueItem SET DocumentPath = @documentPath WHERE Id = @id');
  }

  async findPendingApprovalBySchool(
    schoolId: string,
    executor?: Executor,
  ): Promise<QueueItemWithSchool[]> {
    const result = await request(this.exec(executor))
      .input('schoolId', sql.UniqueIdentifier, schoolId)
      .query<QueueItemWithSchoolRow>(
        `${SELECT_WITH_SCHOOL} WHERE q.SchoolId = @schoolId AND q.ApprovalStatus = 'PENDING' ORDER BY q.ProblemNumber`,
      );
    return result.recordset.map(toEntityWithSchool);
  }

  async create(
    input: { schoolId: string; problemNumber: number; position: number; scheduledAt: Date | null },
    executor?: Executor,
  ): Promise<QueueItem> {
    const result = await request(this.exec(executor))
      .input('schoolId', sql.UniqueIdentifier, input.schoolId)
      .input('problemNumber', sql.Int, input.problemNumber)
      .input('position', sql.Int, input.position)
      .input('scheduledAt', sql.DateTime2, input.scheduledAt)
      .query<QueueItemRow>(`
        INSERT INTO QueueItem (SchoolId, ProblemNumber, Position, ScheduledAt)
        OUTPUT ${QUEUE_ITEM_COLUMNS.replace(/q\./g, 'INSERTED.')}
        VALUES (@schoolId, @problemNumber, @position, @scheduledAt)
      `);
    return toEntity(result.recordset[0]);
  }

  async updatePosition(id: string, position: number, executor?: Executor): Promise<void> {
    await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .input('position', sql.Int, position)
      .query('UPDATE QueueItem SET Position = @position WHERE Id = @id');
  }

  async delete(id: string, executor?: Executor): Promise<void> {
    await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM QueueItem WHERE Id = @id');
  }

  async findStaleInProgress(
    thresholdMinutes: number,
    executor?: Executor,
  ): Promise<QueueItemWithSchool[]> {
    const result = await request(this.exec(executor))
      .input('thresholdMinutes', sql.Int, thresholdMinutes)
      .query<QueueItemWithSchoolRow>(`
        ${SELECT_WITH_SCHOOL}
        WHERE q.Status = 'IN_PROGRESS'
          AND q.ClaimedAt IS NOT NULL
          AND DATEDIFF(MINUTE, q.ClaimedAt, SYSUTCDATETIME()) >= @thresholdMinutes
        ORDER BY q.ClaimedAt
      `);
    return result.recordset.map(toEntityWithSchool);
  }

  async countByStatus(executor?: Executor): Promise<StatusCounts> {
    const result = await request(this.exec(executor)).query<{
      Status: string;
      cnt: number;
    }>('SELECT Status, COUNT(*) AS cnt FROM QueueItem GROUP BY Status');
    const counts: StatusCounts = { waiting: 0, inProgress: 0, done: 0, total: 0 };
    for (const row of result.recordset) {
      if (row.Status === 'WAITING') counts.waiting = row.cnt;
      if (row.Status === 'IN_PROGRESS') counts.inProgress = row.cnt;
      if (row.Status === 'DONE') counts.done = row.cnt;
      counts.total += row.cnt;
    }
    return counts;
  }

  async countByProblem(executor?: Executor): Promise<ProblemCounts[]> {
    const result = await request(this.exec(executor)).query<{
      ProblemNumber: number;
      total: number;
      done: number;
      inProgress: number;
    }>(`
      SELECT ProblemNumber,
             COUNT(*) AS total,
             SUM(CASE WHEN Status = 'DONE' THEN 1 ELSE 0 END) AS done,
             SUM(CASE WHEN Status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgress
      FROM QueueItem
      GROUP BY ProblemNumber
      ORDER BY ProblemNumber
    `);
    return result.recordset.map((r) => ({
      problemNumber: r.ProblemNumber,
      total: r.total,
      done: r.done,
      inProgress: r.inProgress,
    }));
  }

  async existsForSchoolAndProblem(
    schoolId: string,
    problemNumber: number,
    executor?: Executor,
  ): Promise<boolean> {
    const result = await request(this.exec(executor))
      .input('schoolId', sql.UniqueIdentifier, schoolId)
      .input('problemNumber', sql.Int, problemNumber)
      .query<{ cnt: number }>(
        'SELECT COUNT(*) AS cnt FROM QueueItem WHERE SchoolId = @schoolId AND ProblemNumber = @problemNumber',
      );
    return result.recordset[0].cnt > 0;
  }
}
