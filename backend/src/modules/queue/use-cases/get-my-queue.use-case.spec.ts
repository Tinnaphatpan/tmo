import { GetMyQueueUseCase } from './get-my-queue.use-case';
import { FakeQueueRepository, makeQueueItem } from '../../../testing/fake-queue.repository';
import { FakeCommitteeAssignmentRepository } from '../../../testing/fake-committee-assignment.repository';
import { FakeSettingsRepository } from '../../../testing/fake-settings.repository';
import { FakeStudentsRepository, makeStudent } from '../../../testing/fake-students.repository';
import { FakeScoresRepository } from '../../../testing/fake-scores.repository';

function setUp() {
  const queueRepo = new FakeQueueRepository();
  const assignmentRepo = new FakeCommitteeAssignmentRepository();
  const settingsRepo = new FakeSettingsRepository();
  const studentsRepo = new FakeStudentsRepository();
  const scoresRepo = new FakeScoresRepository();
  const useCase = new GetMyQueueUseCase(
    queueRepo,
    assignmentRepo,
    settingsRepo,
    studentsRepo,
    scoresRepo,
  );
  return { queueRepo, assignmentRepo, settingsRepo, studentsRepo, scoresRepo, useCase };
}

describe('GetMyQueueUseCase', () => {
  it('only returns queue items for problem numbers the judge is assigned to (SPEC §0 item 1)', async () => {
    const { queueRepo, assignmentRepo, useCase } = setUp();

    queueRepo.seed(makeQueueItem({ id: 'q1', problemNumber: 1, schoolId: 'school-1' }));
    queueRepo.seed(makeQueueItem({ id: 'q2', problemNumber: 2, schoolId: 'school-1' }));
    queueRepo.seed(makeQueueItem({ id: 'q3', problemNumber: 3, schoolId: 'school-1' }));
    assignmentRepo.seed('judge-1', [2]); // only assigned to problem 2

    const result = await useCase.execute('judge-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('q2');
    expect(result.problemNumbers).toEqual([2]);
  });

  it('returns nothing for a judge with no assignments, not every item', async () => {
    const { queueRepo, useCase } = setUp();

    queueRepo.seed(makeQueueItem({ id: 'q1', problemNumber: 1 }));
    // judge-1 has no CommitteeAssignment rows at all

    const result = await useCase.execute('judge-1');

    expect(result.items).toHaveLength(0);
  });

  it('reports the item this judge currently holds as currentItemId', async () => {
    const { queueRepo, assignmentRepo, useCase } = setUp();

    queueRepo.seed(
      makeQueueItem({
        id: 'q1',
        problemNumber: 1,
        status: 'IN_PROGRESS',
        claimedByUserId: 'judge-1',
      }),
    );
    assignmentRepo.seed('judge-1', [1]);

    const result = await useCase.execute('judge-1');

    expect(result.currentItemId).toBe('q1');
  });

  it('surfaces the global scoring lock flag', async () => {
    const { settingsRepo, useCase } = setUp();
    settingsRepo.seed({ scoringLocked: true });

    const result = await useCase.execute('judge-1');

    expect(result.scoringLocked).toBe(true);
  });

  it('embeds each item’s student roster and any scores already recorded (SPEC §2.5)', async () => {
    const { queueRepo, assignmentRepo, studentsRepo, scoresRepo, useCase } = setUp();

    queueRepo.seed(makeQueueItem({ id: 'q1', problemNumber: 1, schoolId: 'school-1' }));
    assignmentRepo.seed('judge-1', [1]);
    studentsRepo.seed(makeStudent({ id: 's1', schoolId: 'school-1', seqNo: 1 }));
    studentsRepo.seed(makeStudent({ id: 's2', schoolId: 'school-1', seqNo: 2 }));
    await scoresRepo.upsertOne({
      studentId: 's1',
      queueItemId: 'q1',
      value: 7,
      judgeId: 'judge-1',
    });

    const result = await useCase.execute('judge-1');

    expect(result.items[0].school.students.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(result.items[0].scores).toHaveLength(1);
    expect(result.items[0].scores[0].value).toBe(7);
  });
});
