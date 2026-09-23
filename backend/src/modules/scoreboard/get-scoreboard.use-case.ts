import { Injectable } from '@nestjs/common';
import { SchoolsRepository } from '../schools/schools.repository';
import { ScoresRepository } from '../scores/scores.repository';

export interface ScoreboardRow {
  schoolName: string;
  schoolCode: string | null;
  /** index 0..4 = problem 1..5, null = nothing scored yet */
  problems: (number | null)[];
  total: number;
}

const PROBLEM_COUNT = 5;

/** First-pass scoreboard (per-school × per-problem sums, read-only). The
 * design docs don't specify ranking/aggregation rules, so rows are ordered by
 * school name and no rank is implied. */
@Injectable()
export class GetScoreboardUseCase {
  constructor(
    private readonly schoolsRepository: SchoolsRepository,
    private readonly scoresRepository: ScoresRepository,
  ) {}

  async execute(): Promise<ScoreboardRow[]> {
    const [schools, scoreRows] = await Promise.all([
      this.schoolsRepository.findAll(),
      this.scoresRepository.findExportRows(),
    ]);

    const keyOf = (name: string, code: string | null) => `${name}\u0000${code ?? ''}`;
    const byKey = new Map<string, ScoreboardRow>();
    for (const s of schools) {
      byKey.set(keyOf(s.name, s.code), {
        schoolName: s.name,
        schoolCode: s.code,
        problems: Array.from({ length: PROBLEM_COUNT }, () => null),
        total: 0,
      });
    }
    for (const r of scoreRows) {
      const row = byKey.get(keyOf(r.schoolName, r.schoolCode));
      if (!row) continue;
      const i = r.problemNumber - 1;
      row.problems[i] = (row.problems[i] ?? 0) + r.value;
      row.total += r.value;
    }
    return [...byKey.values()].sort((a, b) => a.schoolName.localeCompare(b.schoolName, 'th'));
  }
}
