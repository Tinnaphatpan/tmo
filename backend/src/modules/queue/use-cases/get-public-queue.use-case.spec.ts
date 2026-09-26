import { GetPublicQueueUseCase } from './get-public-queue.use-case';
import { FakeStudentsRepository } from '../../../testing/fake-students.repository';
import { FakeQueueRepository, makeQueueItem } from '../../../testing/fake-queue.repository';

describe('GetPublicQueueUseCase (SPEC §2.5 public board)', () => {
  const t1 = new Date('2026-01-01T06:30:00.000Z');
  const t2 = new Date('2026-01-01T06:45:00.000Z');

  function setUp() {
    const repo = new FakeQueueRepository();
    repo.seed(makeQueueItem({ id: 'a', problemNumber: 2, scheduledAt: t2, status: 'DONE' }));
    repo.seed(makeQueueItem({ id: 'b', problemNumber: 1, scheduledAt: t1, status: 'IN_PROGRESS' }));
    repo.seed(makeQueueItem({ id: 'c', problemNumber: 2, scheduledAt: t1, schoolId: 's2' }));
    repo.seed(makeQueueItem({ id: 'd', problemNumber: 3, scheduledAt: null, schoolId: 's3' }));
    return new GetPublicQueueUseCase(repo, new FakeStudentsRepository());
  }

  it('lists sorted distinct problem numbers and status counts', async () => {
    const res = await setUp().execute();
    expect(res.problemNumbers).toEqual([1, 2, 3]);
    expect(res.counts).toEqual({ waiting: 2, inProgress: 1, done: 1, total: 4 });
    expect(res.byProblem.map((p) => p.problemNumber)).toEqual([1, 2, 3]);
  });

  it('groups scheduled items into time slots in chronological order and ignores unscheduled ones', async () => {
    const res = await setUp().execute();
    expect(res.slots.map((s) => s.startsAt)).toEqual([t1.toISOString(), t2.toISOString()]);
    expect(res.slots[0].cells.map((c) => c.id).sort()).toEqual(['b', 'c']);
    expect(res.slots[1].cells.map((c) => c.id)).toEqual(['a']);
    expect(res.scheduleDate).toBe(t1.toISOString());
  });

  it('never exposes scores, judge identity or approval data (SPEC §0 item 3)', async () => {
    const res = await setUp().execute();
    const json = JSON.stringify(res);
    for (const forbidden of ['claimedByUserId', 'submittedByUserId', 'approvalStatus', 'documentPath', 'score']) {
      expect(json).not.toContain(forbidden);
    }
  });

  it('empty queue: no slots, null scheduleDate', async () => {
    const res = await new GetPublicQueueUseCase(new FakeQueueRepository(), new FakeStudentsRepository()).execute();
    expect(res).toMatchObject({ items: [], slots: [], scheduleDate: null, problemNumbers: [] });
  });
});
