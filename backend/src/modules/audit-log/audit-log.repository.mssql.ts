import { Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DB_POOL } from '../../database/database.tokens';
import { Executor, request } from '../../database/types';
import { AuditLogEntry } from '../../domain/entities';
import {
  AuditLogContext,
  AuditLogPageQuery,
  AuditLogRepository,
  CreateAuditLogInput,
} from './audit-log.repository';

interface AuditLogRow {
  Id: string;
  Action: string;
  EntityType: string;
  EntityId: string;
  OldValue: string | null;
  NewValue: string | null;
  PerformedBy: string;
  CreatedAt: Date;
}

function toEntity(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.Id,
    action: row.Action,
    entityType: row.EntityType,
    entityId: row.EntityId,
    oldValue: row.OldValue,
    newValue: row.NewValue,
    performedBy: row.PerformedBy,
    createdAt: row.CreatedAt,
  };
}

@Injectable()
export class MssqlAuditLogRepository extends AuditLogRepository {
  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {
    super();
  }

  async create(input: CreateAuditLogInput, tx: sql.Transaction): Promise<AuditLogEntry> {
    const result = await request(tx)
      .input('action', sql.NVarChar, input.action)
      .input('entityType', sql.NVarChar, input.entityType)
      .input('entityId', sql.NVarChar, input.entityId)
      .input('oldValue', sql.NVarChar(sql.MAX), input.oldValue)
      .input('newValue', sql.NVarChar(sql.MAX), input.newValue)
      .input('performedBy', sql.UniqueIdentifier, input.performedBy)
      .query<AuditLogRow>(`
        INSERT INTO AuditLog (Action, EntityType, EntityId, OldValue, NewValue, PerformedBy)
        OUTPUT INSERTED.Id, INSERTED.Action, INSERTED.EntityType, INSERTED.EntityId,
               INSERTED.OldValue, INSERTED.NewValue, INSERTED.PerformedBy, INSERTED.CreatedAt
        VALUES (@action, @entityType, @entityId, @oldValue, @newValue, @performedBy)
      `);
    return toEntity(result.recordset[0]);
  }

  async findAll(executor?: Executor): Promise<AuditLogEntry[]> {
    const result = await request(executor ?? this.pool).query<AuditLogRow>(
      'SELECT Id, Action, EntityType, EntityId, OldValue, NewValue, PerformedBy, CreatedAt FROM AuditLog ORDER BY CreatedAt DESC',
    );
    return result.recordset.map(toEntity);
  }

  async findAllWithContext(
    executor?: Executor,
  ): Promise<Array<AuditLogEntry & { performedByDisplayName: string }>> {
    const result = await request(executor ?? this.pool).query<
      AuditLogRow & { PerformedByDisplayName: string }
    >(`
      SELECT a.Id, a.Action, a.EntityType, a.EntityId, a.OldValue, a.NewValue,
             a.PerformedBy, a.CreatedAt, u.DisplayName AS PerformedByDisplayName
      FROM AuditLog a
      JOIN [User] u ON u.Id = a.PerformedBy
      ORDER BY a.CreatedAt DESC
    `);
    return result.recordset.map((row) => ({
      ...toEntity(row),
      performedByDisplayName: row.PerformedByDisplayName,
    }));
  }

  async findPage(
    query: AuditLogPageQuery,
    executor?: Executor,
  ): Promise<{ items: Array<AuditLogEntry & AuditLogContext>; total: number }> {
    // EntityId is free text (some rows are not GUIDs, e.g. 'schedule'), so the
    // joins go through TRY_CAST and simply yield NULLs when nothing matches.
    const from = `
      FROM AuditLog a
      JOIN [User] u ON u.Id = a.PerformedBy
      LEFT JOIN Score sc ON a.EntityType = 'Score' AND sc.Id = TRY_CAST(a.EntityId AS UNIQUEIDENTIFIER)
      LEFT JOIN Student st ON st.Id = sc.StudentId
      LEFT JOIN QueueItem qi ON qi.Id = sc.QueueItemId
      LEFT JOIN School sch ON sch.Id = st.SchoolId
      LEFT JOIN [User] tu ON a.EntityType = 'User' AND tu.Id = TRY_CAST(a.EntityId AS UNIQUEIDENTIFIER)
      WHERE (@action IS NULL OR a.Action = @action)
        AND (@search IS NULL
             OR u.DisplayName LIKE @search ESCAPE '\\' OR st.Name LIKE @search ESCAPE '\\'
             OR sch.Name LIKE @search ESCAPE '\\' OR tu.DisplayName LIKE @search ESCAPE '\\')
    `;
    const bind = (r: sql.Request) => {
      const escaped = query.search?.trim().replace(/[\\%_[]/g, '\\$&');
      return r
        .input('action', sql.NVarChar, query.action || null)
        .input('search', sql.NVarChar, escaped ? `%${escaped}%` : null);
    };
    const ex = executor ?? this.pool;

    const count = await bind(request(ex)).query<{ Total: number }>(
      `SELECT COUNT(*) AS Total ${from}`,
    );
    const result = await bind(request(ex))
      .input('offset', sql.Int, query.offset)
      .input('limit', sql.Int, query.limit)
      .query<
        AuditLogRow & {
          PerformedByDisplayName: string;
          StudentName: string | null;
          SchoolName: string | null;
          ProblemNumber: number | null;
          TargetUserName: string | null;
        }
      >(`
        SELECT a.Id, a.Action, a.EntityType, a.EntityId, a.OldValue, a.NewValue,
               a.PerformedBy, a.CreatedAt, u.DisplayName AS PerformedByDisplayName,
               st.Name AS StudentName, sch.Name AS SchoolName,
               qi.ProblemNumber AS ProblemNumber, tu.DisplayName AS TargetUserName
        ${from}
        ORDER BY a.CreatedAt DESC, a.Id
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    return {
      total: count.recordset[0].Total,
      items: result.recordset.map((row) => ({
        ...toEntity(row),
        performedByDisplayName: row.PerformedByDisplayName,
        studentName: row.StudentName,
        schoolName: row.SchoolName,
        problemNumber: row.ProblemNumber,
        targetUserName: row.TargetUserName,
      })),
    };
  }
}
