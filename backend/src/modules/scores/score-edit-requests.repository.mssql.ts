import { Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DB_POOL } from '../../database/database.tokens';
import { Executor, request } from '../../database/types';
import { ScoreEditRequest } from '../../domain/entities';
import {
  CreateScoreEditRequestInput,
  ScoreEditRequestsRepository,
  ScoreEditRequestWithContext,
} from './score-edit-requests.repository';

interface Row {
  Id: string;
  ScoreId: string;
  RequestedBy: string;
  OldValue: number;
  NewValue: number;
  Reason: string;
  Status: ScoreEditRequest['status'];
  ReviewedBy: string | null;
  ReviewedAt: Date | null;
  CreatedAt: Date;
}

function toEntity(row: Row): ScoreEditRequest {
  return {
    id: row.Id,
    scoreId: row.ScoreId,
    requestedBy: row.RequestedBy,
    oldValue: Number(row.OldValue),
    newValue: Number(row.NewValue),
    reason: row.Reason,
    status: row.Status,
    reviewedBy: row.ReviewedBy,
    reviewedAt: row.ReviewedAt,
    createdAt: row.CreatedAt,
  };
}

interface ContextRow extends Row {
  SchoolName: string;
  StudentName: string;
  StudentCode: string;
  ProblemNumber: number;
  RequestedByDisplayName: string;
}

@Injectable()
export class MssqlScoreEditRequestsRepository extends ScoreEditRequestsRepository {
  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {
    super();
  }

  private exec(executor?: Executor): Executor {
    return executor ?? this.pool;
  }

  async create(input: CreateScoreEditRequestInput, executor?: Executor): Promise<ScoreEditRequest> {
    const result = await request(this.exec(executor))
      .input('scoreId', sql.UniqueIdentifier, input.scoreId)
      .input('requestedBy', sql.UniqueIdentifier, input.requestedBy)
      .input('oldValue', sql.Decimal(4, 2), input.oldValue)
      .input('newValue', sql.Decimal(4, 2), input.newValue)
      .input('reason', sql.NVarChar(sql.MAX), input.reason)
      .query<Row>(`
        INSERT INTO ScoreEditRequest (ScoreId, RequestedBy, OldValue, NewValue, Reason)
        OUTPUT INSERTED.Id, INSERTED.ScoreId, INSERTED.RequestedBy, INSERTED.OldValue,
               INSERTED.NewValue, INSERTED.Reason, INSERTED.Status, INSERTED.ReviewedBy,
               INSERTED.ReviewedAt, INSERTED.CreatedAt
        VALUES (@scoreId, @requestedBy, @oldValue, @newValue, @reason)
      `);
    return toEntity(result.recordset[0]);
  }

  async findById(id: string, executor?: Executor): Promise<ScoreEditRequest | null> {
    const result = await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query<Row>(
        'SELECT Id, ScoreId, RequestedBy, OldValue, NewValue, Reason, Status, ReviewedBy, ReviewedAt, CreatedAt FROM ScoreEditRequest WHERE Id = @id',
      );
    return result.recordset[0] ? toEntity(result.recordset[0]) : null;
  }

  async findAllWithContext(executor?: Executor): Promise<ScoreEditRequestWithContext[]> {
    const result = await request(this.exec(executor)).query<ContextRow>(`
      SELECT r.Id, r.ScoreId, r.RequestedBy, r.OldValue, r.NewValue, r.Reason, r.Status,
             r.ReviewedBy, r.ReviewedAt, r.CreatedAt,
             sc.Name AS SchoolName, st.Name AS StudentName, st.StudentCode,
             q.ProblemNumber, u.DisplayName AS RequestedByDisplayName
      FROM ScoreEditRequest r
      JOIN Score sco ON sco.Id = r.ScoreId
      JOIN Student st ON st.Id = sco.StudentId
      JOIN School sc ON sc.Id = st.SchoolId
      JOIN QueueItem q ON q.Id = sco.QueueItemId
      JOIN [User] u ON u.Id = r.RequestedBy
      ORDER BY r.CreatedAt DESC
    `);
    return result.recordset.map((row) => ({
      ...toEntity(row),
      schoolName: row.SchoolName,
      studentName: row.StudentName,
      studentCode: row.StudentCode,
      problemNumber: row.ProblemNumber,
      requestedByDisplayName: row.RequestedByDisplayName,
    }));
  }

  async updateStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewedBy: string,
    executor?: Executor,
  ): Promise<ScoreEditRequest> {
    const result = await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.VarChar, status)
      .input('reviewedBy', sql.UniqueIdentifier, reviewedBy)
      .query<Row>(`
        UPDATE ScoreEditRequest
        SET Status = @status, ReviewedBy = @reviewedBy, ReviewedAt = SYSUTCDATETIME()
        OUTPUT INSERTED.Id, INSERTED.ScoreId, INSERTED.RequestedBy, INSERTED.OldValue,
               INSERTED.NewValue, INSERTED.Reason, INSERTED.Status, INSERTED.ReviewedBy,
               INSERTED.ReviewedAt, INSERTED.CreatedAt
        WHERE Id = @id
      `);
    return toEntity(result.recordset[0]);
  }
}
