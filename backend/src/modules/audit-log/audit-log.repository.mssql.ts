import { Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DB_POOL } from '../../database/database.tokens';
import { Executor, request } from '../../database/types';
import { AuditLogEntry } from '../../domain/entities';
import { AuditLogRepository, CreateAuditLogInput } from './audit-log.repository';

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
}
