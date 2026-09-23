import { GetMentorReportUseCase } from './get-mentor-report.use-case';
import { FakeSchoolsRepository } from '../../testing/fake-schools.repository';
import { FakeStudentsRepository, makeStudent } from '../../testing/fake-students.repository';
import { FakeScoresRepository } from '../../testing/fake-scores.repository';

function setUp() {
  const schoolsRepo = new FakeSchoolsRepository();
  const studentsRepo = new FakeStudentsRepository();
  const scoresRepo = new FakeScoresRepository();
  const useCase = new GetMentorReportUseCase(schoolsRepo, studentsRepo, scoresRepo);

  schoolsRepo.seed({ id: 'school-A', name: 'โรงเรียน A', code: 'A' });
  schoolsRepo.seed({ id: 'school-B', name: 'โรงเรียน B', code: 'B' });

  studentsRepo.seed(makeStudent({ id: 'a1', schoolId: 'school-A', seqNo: 1, studentCode: '1A', name: 'เด็ก A1' }));
  studentsRepo.seed(makeStudent({ id: 'b1', schoolId: 'school-B', seqNo: 1, studentCode: '1B', name: 'เด็ก B1' }));

  scoresRepo.seedExportRow({
    schoolId: 'school-A',
    schoolName: 'โรงเรียน A',
    schoolCode: 'A',
    studentCode: '1A',
    studentName: 'เด็ก A1',
    seqNo: 1,
    problemNumber: 1,
    value: 9,
    judgeDisplayName: 'Judge',
    judgeUsername: 'judge1',
    recordedAt: new Date(),
  });
  scoresRepo.seedExportRow({
    schoolId: 'school-B',
    schoolName: 'โรงเรียน B',
    schoolCode: 'B',
    studentCode: '1B',
    studentName: 'เด็ก B1',
    seqNo: 1,
    problemNumber: 1,
    value: 2,
    judgeDisplayName: 'Judge',
    judgeUsername: 'judge1',
    recordedAt: new Date(),
  });

  return { useCase };
}

describe('GetMentorReportUseCase', () => {
  it('only returns rows and scores for the requested school (SPEC §4.4 IDOR guard)', async () => {
    const { useCase } = setUp();

    const reportA = await useCase.execute('school-A');

    expect(reportA.schoolName).toBe('โรงเรียน A');
    expect(reportA.rows).toHaveLength(1);
    expect(reportA.rows[0].studentCode).toBe('1A');
    expect(reportA.rows[0].scores[0]).toBe(9);
    expect(reportA.grandTotal).toBe(9);
  });

  it('never leaks another school’s students or scores into the result', async () => {
    const { useCase } = setUp();

    const reportA = await useCase.execute('school-A');
    const reportB = await useCase.execute('school-B');

    expect(reportA.rows.map((r) => r.studentCode)).not.toContain('1B');
    expect(reportB.rows.map((r) => r.studentCode)).not.toContain('1A');
    expect(reportB.rows[0].scores[0]).toBe(2);
  });

  it('shows null (not zero) for a student not yet scored on a problem', async () => {
    const { useCase } = setUp();

    const reportA = await useCase.execute('school-A');

    expect(reportA.rows[0].scores[1]).toBeNull();
    expect(reportA.rows[0].scores[2]).toBeNull();
  });
});
