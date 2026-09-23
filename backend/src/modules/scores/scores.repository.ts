import { Score } from '../../domain/entities';
import { Executor } from '../../database/types';

export interface UpsertScoreInput {
  studentId: string;
  queueItemId: string;
  value: number;
  judgeId: string;
}

export interface UpsertScoreResult {
  score: Score;
  oldValue: number | null;
}

/** One export-ready row, already joined (SPEC §4.2 columns). */
export interface ScoreExportRow {
  schoolName: string;
  schoolCode: string | null;
  studentCode: string;
  studentName: string;
  problemNumber: number;
  value: number;
  judgeDisplayName: string;
  judgeUsername: string;
  recordedAt: Date;
  seqNo: number;
}

export abstract class ScoresRepository {
  abstract findByQueueItem(queueItemId: string, executor?: Executor): Promise<Score[]>;
  abstract findById(id: string, executor?: Executor): Promise<Score | null>;
  /**
   * Upsert keyed on (StudentId, QueueItemId) — intentionally without JudgeId
   * (SPEC §8 item 1 / PROMPT.md §3: multi-judge averaging is out of scope
   * for this rewrite, confirmed with the requester). A later judge's write
   * overwrites the earlier one.
   */
  abstract upsertOne(input: UpsertScoreInput, executor: Executor): Promise<UpsertScoreResult>;
  abstract updateValue(id: string, value: number, executor: Executor): Promise<Score>;
  abstract findExportRows(executor?: Executor): Promise<ScoreExportRow[]>;
  abstract findForSchool(schoolId: string, executor?: Executor): Promise<ScoreExportRow[]>;
}
