import { Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DB_POOL } from '../../database/database.tokens';
import { Executor, request } from '../../database/types';
import { CompetitionSettings } from '../../domain/entities';
import { SettingsRepository } from './settings.repository';

interface SettingsRow {
  Id: 1;
  ScoringLocked: boolean;
  LockedAt: Date | null;
  LockedBy: string | null;
}

function toEntity(row: SettingsRow): CompetitionSettings {
  return {
    id: 1,
    scoringLocked: row.ScoringLocked,
    lockedAt: row.LockedAt,
    lockedBy: row.LockedBy,
  };
}

@Injectable()
export class MssqlSettingsRepository extends SettingsRepository {
  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {
    super();
  }

  async get(executor?: Executor): Promise<CompetitionSettings> {
    const result = await request(executor ?? this.pool).query<SettingsRow>(
      'SELECT Id, ScoringLocked, LockedAt, LockedBy FROM CompetitionSettings WHERE Id = 1',
    );
    return toEntity(result.recordset[0]);
  }

  async setLocked(
    locked: boolean,
    lockedBy: string | null,
    executor?: Executor,
  ): Promise<CompetitionSettings> {
    const result = await request(executor ?? this.pool)
      .input('locked', sql.Bit, locked)
      .input('lockedBy', sql.UniqueIdentifier, lockedBy)
      .query<SettingsRow>(`
        UPDATE CompetitionSettings
        SET ScoringLocked = @locked,
            LockedAt = CASE WHEN @locked = 1 THEN SYSUTCDATETIME() ELSE LockedAt END,
            LockedBy = CASE WHEN @locked = 1 THEN @lockedBy ELSE LockedBy END
        OUTPUT INSERTED.Id, INSERTED.ScoringLocked, INSERTED.LockedAt, INSERTED.LockedBy
        WHERE Id = 1
      `);
    return toEntity(result.recordset[0]);
  }
}
