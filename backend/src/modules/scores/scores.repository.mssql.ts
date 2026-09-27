import { Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DB_POOL } from '../../database/database.tokens';
import { Executor, request } from '../../database/types';
import { Score } from '../../domain/entities';
import {
  ScoreExportRow,
  ScoresRepository,
  UpsertScoreInput,
  UpsertScoreResult,
} from './scores.repository';

interface ScoreRow {
  Id: string;
  StudentId: string;
  QueueItemId: string;
  Value: number;
  JudgeId: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

function toEntity(row: ScoreRow): Score {
  return {
    id: row.Id,
    studentId: row.StudentId,
    queueItemId: row.QueueItemId,
    value: Number(row.Value),
    judgeId: row.JudgeId,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

interface ExportRow {
  SchoolName: string;
  SchoolCode: string | null;
  StudentCode: string;
  StudentName: string;
  SeqNo: number;
  ProblemNumber: number;
  Value: number;
  JudgeDisplayName: string;
  JudgeUsername: string;
  UpdatedAt: Date;
  ScoreId: string;
}

function toExportRow(row: ExportRow): ScoreExportRow {
  return {
    schoolName: row.SchoolName,
    schoolCode: row.SchoolCode,
    studentCode: row.StudentCode,
    studentName: row.StudentName,
    seqNo: row.SeqNo,
    problemNumber: row.ProblemNumber,
    value: Number(row.Value),
    judgeDisplayName: row.JudgeDisplayName,
    judgeUsername: row.JudgeUsername,
    recordedAt: row.UpdatedAt,
    scoreId: row.ScoreId,
  };
}

const EXPORT_SELECT = `
  SELECT sc.Name AS SchoolName, sc.Code AS SchoolCode,
         st.StudentCode, st.Name AS StudentName, st.SeqNo,
         q.ProblemNumber,
         sco.Id AS ScoreId, sco.Value, sco.UpdatedAt,
         u.DisplayName AS JudgeDisplayName, u.Username AS JudgeUsername
  FROM Score sco
  JOIN Student st ON st.Id = sco.StudentId
  JOIN School sc ON sc.Id = st.SchoolId
  JOIN QueueItem q ON q.Id = sco.QueueItemId
  JOIN [User] u ON u.Id = sco.JudgeId
`;

@Injectable()
export class MssqlScoresRepository extends ScoresRepository {
  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {
    super();
  }

  private exec(executor?: Executor): Executor {
    return executor ?? this.pool;
  }

  async findByQueueItem(queueItemId: string, executor?: Executor): Promise<Score[]> {
    const result = await request(this.exec(executor))
      .input('queueItemId', sql.UniqueIdentifier, queueItemId)
      .query<ScoreRow>(
        'SELECT Id, StudentId, QueueItemId, Value, JudgeId, CreatedAt, UpdatedAt FROM Score WHERE QueueItemId = @queueItemId',
      );
    return result.recordset.map(toEntity);
  }

  async findByQueueItems(queueItemIds: string[], executor?: Executor): Promise<Score[]> {
    if (queueItemIds.length === 0) return [];
    const req = request(this.exec(executor));
    const placeholders = queueItemIds.map((id, i) => {
      req.input(`q${i}`, sql.UniqueIdentifier, id);
      return `@q${i}`;
    });
    const result = await req.query<ScoreRow>(
      `SELECT Id, StudentId, QueueItemId, Value, JudgeId, CreatedAt, UpdatedAt FROM Score WHERE QueueItemId IN (${placeholders.join(',')})`,
    );
    return result.recordset.map(toEntity);
  }

  async findById(id: string, executor?: Executor): Promise<Score | null> {
    const result = await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query<ScoreRow>(
        'SELECT Id, StudentId, QueueItemId, Value, JudgeId, CreatedAt, UpdatedAt FROM Score WHERE Id = @id',
      );
    return result.recordset[0] ? toEntity(result.recordset[0]) : null;
  }

  /**
   * UPDATE first, INSERT only when nothing matched — deliberately NOT MERGE.
   * MERGE takes serializable key-range locks on UQ_Score_Student_QueueItem, and
   * concurrent submissions for different queue items deadlocked on those ranges
   * (each attempt then stalled ~10 s until SQL Server's deadlock monitor picked a
   * victim). A queue item has exactly one holder, so the only true race left is a
   * double-submit of the same item; the unique constraint catches that (2627/2601)
   * and we simply retry, which then takes the UPDATE branch.
   */
  async upsertOne(input: UpsertScoreInput, executor: Executor): Promise<UpsertScoreResult> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.upsertOnce(input, executor);
      } catch (err) {
        const num = (err as { number?: number })?.number;
        if ((num === 2627 || num === 2601) && attempt < 2) continue;
        throw err;
      }
    }
  }

  private async upsertOnce(input: UpsertScoreInput, executor: Executor): Promise<UpsertScoreResult> {
    const result = await request(executor)
      .input('studentId', sql.UniqueIdentifier, input.studentId)
      .input('queueItemId', sql.UniqueIdentifier, input.queueItemId)
      .input('value', sql.Decimal(4, 2), input.value)
      .input('judgeId', sql.UniqueIdentifier, input.judgeId)
      .query<ScoreRow & { OldValue: number | null }>(`
        DECLARE @r TABLE (
          Id UNIQUEIDENTIFIER, StudentId UNIQUEIDENTIFIER, QueueItemId UNIQUEIDENTIFIER,
          Value DECIMAL(4, 2), JudgeId UNIQUEIDENTIFIER, CreatedAt DATETIME2, UpdatedAt DATETIME2,
          OldValue DECIMAL(4, 2)
        );

        UPDATE Score
        SET Value = @value, JudgeId = @judgeId, UpdatedAt = SYSUTCDATETIME()
        OUTPUT inserted.Id, inserted.StudentId, inserted.QueueItemId, inserted.Value,
               inserted.JudgeId, inserted.CreatedAt, inserted.UpdatedAt, deleted.Value
        INTO @r
        WHERE StudentId = @studentId AND QueueItemId = @queueItemId;

        IF @@ROWCOUNT = 0
          INSERT INTO Score (StudentId, QueueItemId, Value, JudgeId)
          OUTPUT inserted.Id, inserted.StudentId, inserted.QueueItemId, inserted.Value,
                 inserted.JudgeId, inserted.CreatedAt, inserted.UpdatedAt, NULL
          INTO @r
          VALUES (@studentId, @queueItemId, @value, @judgeId);

        SELECT * FROM @r;
      `);
    const row = result.recordset[0];
    return {
      score: toEntity(row),
      oldValue: row.OldValue === null || row.OldValue === undefined ? null : Number(row.OldValue),
    };
  }

  async updateValue(id: string, value: number, executor: Executor): Promise<Score> {
    const result = await request(executor)
      .input('id', sql.UniqueIdentifier, id)
      .input('value', sql.Decimal(4, 2), value)
      .query<ScoreRow>(`
        UPDATE Score
        SET Value = @value, UpdatedAt = SYSUTCDATETIME()
        OUTPUT INSERTED.Id, INSERTED.StudentId, INSERTED.QueueItemId, INSERTED.Value,
               INSERTED.JudgeId, INSERTED.CreatedAt, INSERTED.UpdatedAt
        WHERE Id = @id
      `);
    return toEntity(result.recordset[0]);
  }

  async findExportRows(executor?: Executor): Promise<ScoreExportRow[]> {
    const result = await request(this.exec(executor)).query<ExportRow>(
      `${EXPORT_SELECT} ORDER BY sc.Name, st.SeqNo, q.ProblemNumber`,
    );
    return result.recordset.map(toExportRow);
  }

  async findForSchool(schoolId: string, executor?: Executor): Promise<ScoreExportRow[]> {
    const result = await request(this.exec(executor))
      .input('schoolId', sql.UniqueIdentifier, schoolId)
      .query<ExportRow>(
        `${EXPORT_SELECT} WHERE sc.Id = @schoolId ORDER BY st.SeqNo, q.ProblemNumber`,
      );
    return result.recordset.map(toExportRow);
  }
}
