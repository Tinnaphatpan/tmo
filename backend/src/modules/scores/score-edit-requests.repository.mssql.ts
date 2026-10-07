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

/** Row as stored: ScoreEditRequest no longer has an OldValue column. */
interface Row {
  Id: string;
  ScoreId: string;
  RequestedBy: string;
  OldValue: number | null;
  NewValue: number;
  Reason: string;
  Status: ScoreEditRequest['status'];
  ReviewedBy: string | null;
  ReviewedAt: Date | null;
  CreatedAt: Date;
}

/**
 * The old value is the 'value' change of this request's SCORE_EDIT_REQUESTED
 * audit entry (the Score's value when the request was made). Read from there,
 * so it is never stored twice.
 */
const OLD_VALUE_SQL = `(
  SELECT CAST(c.OldValue AS DECIMAL(4, 2))
  FROM AuditLog a
  JOIN AuditLogChange c ON c.AuditLogId = a.Id AND c.FieldName = 'value'
  WHERE a.Action = 'SCORE_EDIT_REQUESTED'
    AND a.EntityType = 'ScoreEditRequest'
    AND a.EntityId = CAST(r.Id AS NVARCHAR(100))
)`;

const ROW_COLUMNS = `
  r.Id, r.ScoreId, r.RequestedBy, ${OLD_VALUE_SQL} AS OldValue, r.NewValue, r.Reason,
  r.Status, r.ReviewedBy, r.ReviewedAt, r.CreatedAt`;

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
  RequestedByRole: ScoreEditRequestWithContext['requestedByRole'];
  SchoolId: string;
}

function toContextEntity(row: ContextRow): ScoreEditRequestWithContext {
  return {
    ...toEntity(row),
    schoolName: row.SchoolName,
    studentName: row.StudentName,
    studentCode: row.StudentCode,
    problemNumber: row.ProblemNumber,
    requestedByDisplayName: row.RequestedByDisplayName,
    requestedByRole: row.RequestedByRole,
    schoolId: row.SchoolId,
  };
}

const CONTEXT_SELECT = `
  SELECT ${ROW_COLUMNS},
         sc.Name AS SchoolName, st.Name AS StudentName, st.StudentCode,
         q.ProblemNumber, u.DisplayName AS RequestedByDisplayName,
         u.Role AS RequestedByRole, sc.Id AS SchoolId
  FROM ScoreEditRequest r
  JOIN Score sco ON sco.Id = r.ScoreId
  JOIN Student st ON st.Id = sco.StudentId
  JOIN School sc ON sc.Id = st.SchoolId
  JOIN QueueItem q ON q.Id = sco.QueueItemId
  JOIN [User] u ON u.Id = r.RequestedBy
`;

@Injectable()
export class MssqlScoreEditRequestsRepository extends ScoreEditRequestsRepository {
  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {
    super();
  }

  private exec(executor?: Executor): Executor {
    return executor ?? this.pool;
  }

  async create(
    input: CreateScoreEditRequestInput,
    executor?: Executor,
  ): Promise<Omit<ScoreEditRequest, 'oldValue'>> {
    const result = await request(this.exec(executor))
      .input('scoreId', sql.UniqueIdentifier, input.scoreId)
      .input('requestedBy', sql.UniqueIdentifier, input.requestedBy)
      .input('newValue', sql.Decimal(4, 2), input.newValue)
      .input('reason', sql.NVarChar(sql.MAX), input.reason)
      .query<Omit<Row, 'OldValue'>>(`
        INSERT INTO ScoreEditRequest (ScoreId, RequestedBy, NewValue, Reason)
        OUTPUT INSERTED.Id, INSERTED.ScoreId, INSERTED.RequestedBy,
               INSERTED.NewValue, INSERTED.Reason, INSERTED.Status, INSERTED.ReviewedBy,
               INSERTED.ReviewedAt, INSERTED.CreatedAt
        VALUES (@scoreId, @requestedBy, @newValue, @reason)
      `);
    const row = result.recordset[0];
    return {
      id: row.Id,
      scoreId: row.ScoreId,
      requestedBy: row.RequestedBy,
      newValue: Number(row.NewValue),
      reason: row.Reason,
      status: row.Status,
      reviewedBy: row.ReviewedBy,
      reviewedAt: row.ReviewedAt,
      createdAt: row.CreatedAt,
    };
  }

  async findById(id: string, executor?: Executor): Promise<ScoreEditRequest | null> {
    const result = await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query<Row>(`SELECT ${ROW_COLUMNS} FROM ScoreEditRequest r WHERE r.Id = @id`);
    return result.recordset[0] ? toEntity(result.recordset[0]) : null;
  }

  async findAllWithContext(executor?: Executor): Promise<ScoreEditRequestWithContext[]> {
    const result = await request(this.exec(executor)).query<ContextRow>(`
      ${CONTEXT_SELECT}
      ORDER BY r.CreatedAt DESC
    `);
    return result.recordset.map(toContextEntity);
  }

  async findBySchoolWithContext(
    schoolId: string,
    executor?: Executor,
  ): Promise<ScoreEditRequestWithContext[]> {
    const result = await request(this.exec(executor))
      .input('schoolId', sql.UniqueIdentifier, schoolId)
      .query<ContextRow>(`
        ${CONTEXT_SELECT}
        WHERE sc.Id = @schoolId
        ORDER BY r.CreatedAt DESC
      `);
    return result.recordset.map(toContextEntity);
  }

  async updateStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewedBy: string,
    executor?: Executor,
  ): Promise<ScoreEditRequest> {
    // UPDATE and the re-read share one batch so the derived OldValue comes back.
    const result = await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.VarChar, status)
      .input('reviewedBy', sql.UniqueIdentifier, reviewedBy)
      .query<Row>(`
        UPDATE ScoreEditRequest
        SET Status = @status, ReviewedBy = @reviewedBy, ReviewedAt = SYSUTCDATETIME()
        WHERE Id = @id;

        SELECT ${ROW_COLUMNS}
        FROM ScoreEditRequest r
        WHERE r.Id = @id;
      `);
    return toEntity(result.recordset[0]);
  }
}
