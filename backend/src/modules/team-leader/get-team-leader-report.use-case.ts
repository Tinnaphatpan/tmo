import { Injectable } from '@nestjs/common';
import { SchoolsRepository } from '../schools/schools.repository';
import { ScoresRepository } from '../scores/scores.repository';
import { StudentsRepository } from '../students/students.repository';

export interface TeamLeaderReportRow {
  studentCode: string;
  name: string;
  /** index 0..4 = problem 1..5, null = not yet scored */
  scores: (number | null)[];
  /** Same indexing as `scores` — lets the mentor request an edit on one cell. */
  scoreIds: (string | null)[];
  total: number;
}

export interface TeamLeaderReport {
  schoolName: string;
  schoolCode: string | null;
  rows: TeamLeaderReportRow[];
  grandTotal: number;
}

const PROBLEM_COUNT = 5;

/**
 * SPEC §4.4 / §5.3 — GET /api/team-leader/export and the /team-leader page's table.
 *
 * `schoolId` here MUST be `session.user.schoolId`, never a client-supplied
 * value (SPEC §4.4 calls this out explicitly as an IDOR risk) — enforced by
 * only ever wiring this use case to `@CurrentUser().schoolId` at the
 * controller, never to a query/body parameter.
 */
@Injectable()
export class GetTeamLeaderReportUseCase {
  constructor(
    private readonly schoolsRepository: SchoolsRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly scoresRepository: ScoresRepository,
  ) {}

  async execute(schoolId: string): Promise<TeamLeaderReport> {
    const [school, roster, scoreRows] = await Promise.all([
      this.schoolsRepository.findById(schoolId),
      this.studentsRepository.findBySchool(schoolId),
      this.scoresRepository.findForSchool(schoolId),
    ]);

    const scoresByStudentCode = new Map<string, (number | null)[]>();
    for (const student of roster) {
      scoresByStudentCode.set(student.studentCode, new Array(PROBLEM_COUNT).fill(null));
    }
    for (const row of scoreRows) {
      const cells = scoresByStudentCode.get(row.studentCode);
      if (cells) cells[row.problemNumber - 1] = row.value;
    }

    const idsByStudentCode = new Map<string, (string | null)[]>();
    for (const student of roster) {
      idsByStudentCode.set(student.studentCode, new Array(PROBLEM_COUNT).fill(null));
    }
    for (const row of scoreRows) {
      const cells = idsByStudentCode.get(row.studentCode);
      if (cells && row.scoreId) cells[row.problemNumber - 1] = row.scoreId;
    }

    const rows: TeamLeaderReportRow[] = roster
      .sort((a, b) => a.seqNo - b.seqNo)
      .map((student) => {
        const scores = scoresByStudentCode.get(student.studentCode) ?? new Array(PROBLEM_COUNT).fill(null);
        const total = scores.reduce((sum: number, v) => sum + (v ?? 0), 0);
        return {
          studentCode: student.studentCode,
          name: student.name,
          scores,
          scoreIds: idsByStudentCode.get(student.studentCode) ?? new Array(PROBLEM_COUNT).fill(null),
          total,
        };
      });

    return {
      schoolName: school?.name ?? '',
      schoolCode: school?.code ?? null,
      rows,
      grandTotal: rows.reduce((sum, r) => sum + r.total, 0),
    };
  }
}
