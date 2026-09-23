import { Score } from '../domain/entities';
import {
  ScoreExportRow,
  ScoresRepository,
  UpsertScoreInput,
  UpsertScoreResult,
} from '../modules/scores/scores.repository';

export class FakeScoresRepository extends ScoresRepository {
  readonly scores: Score[] = [];
  readonly exportRows: (ScoreExportRow & { schoolId: string })[] = [];
  private nextId = 1;

  seedExportRow(row: ScoreExportRow & { schoolId: string }): void {
    this.exportRows.push(row);
  }

  async findByQueueItem(queueItemId: string): Promise<Score[]> {
    return this.scores.filter((s) => s.queueItemId === queueItemId);
  }

  async findById(id: string): Promise<Score | null> {
    return this.scores.find((s) => s.id === id) ?? null;
  }

  async upsertOne(input: UpsertScoreInput): Promise<UpsertScoreResult> {
    const existing = this.scores.find(
      (s) => s.studentId === input.studentId && s.queueItemId === input.queueItemId,
    );
    if (existing) {
      const oldValue = existing.value;
      existing.value = input.value;
      existing.judgeId = input.judgeId;
      existing.updatedAt = new Date();
      return { score: { ...existing }, oldValue };
    }
    const score: Score = {
      id: `score-${this.nextId++}`,
      studentId: input.studentId,
      queueItemId: input.queueItemId,
      value: input.value,
      judgeId: input.judgeId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.scores.push(score);
    return { score, oldValue: null };
  }

  async updateValue(id: string, value: number): Promise<Score> {
    const score = this.scores.find((s) => s.id === id);
    if (!score) throw new Error('score not found');
    score.value = value;
    score.updatedAt = new Date();
    return score;
  }

  async findExportRows(): Promise<ScoreExportRow[]> {
    return this.exportRows;
  }

  async findForSchool(schoolId: string): Promise<ScoreExportRow[]> {
    return this.exportRows.filter((r) => r.schoolId === schoolId);
  }
}
