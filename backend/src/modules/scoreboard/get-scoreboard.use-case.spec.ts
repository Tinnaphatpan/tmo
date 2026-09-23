import { GetScoreboardUseCase } from './get-scoreboard.use-case';
import { FakeSchoolsRepository } from '../../testing/fake-schools.repository';
import { FakeScoresRepository } from '../../testing/fake-scores.repository';

describe('GetScoreboardUseCase (F5)', () => {
  it('sums scores per school per problem and lists unscored schools with nulls', async () => {
    const schools = new FakeSchoolsRepository();
    const scores = new FakeScoresRepository();
    schools.seed({ id: 's1', name: 'B School', code: 'B' });
    schools.seed({ id: 's2', name: 'A School', code: null });
    const base = {
      schoolCode: 'B',
      studentName: 'x',
      judgeDisplayName: 'j',
      judgeUsername: 'j',
      recordedAt: new Date(),
      seqNo: 1,
      schoolId: 's1',
    };
    scores.seedExportRow({ ...base, schoolName: 'B School', studentCode: 'a', problemNumber: 1, value: 7 });
    scores.seedExportRow({ ...base, schoolName: 'B School', studentCode: 'b', problemNumber: 1, value: 3.5 });
    scores.seedExportRow({ ...base, schoolName: 'B School', studentCode: 'a', problemNumber: 3, value: 2 });

    const rows = await new GetScoreboardUseCase(schools, scores).execute();

    expect(rows.map((r) => r.schoolName)).toEqual(['A School', 'B School']);
    expect(rows[0]).toMatchObject({ problems: [null, null, null, null, null], total: 0 });
    expect(rows[1].problems).toEqual([10.5, null, 2, null, null]);
    expect(rows[1].total).toBe(12.5);
  });
});
