import { ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { ClaimQueueItemUseCase } from './claim-queue-item.use-case';
import { FakeQueueRepository, makeQueueItem } from '../../../testing/fake-queue.repository';
import { FakeUserAssignmentRepository } from '../../../testing/fake-user-assignment.repository';

describe('ClaimQueueItemUseCase', () => {
  let queueRepo: FakeQueueRepository;
  let assignmentRepo: FakeUserAssignmentRepository;
  let useCase: ClaimQueueItemUseCase;

  beforeEach(() => {
    queueRepo = new FakeQueueRepository();
    assignmentRepo = new FakeUserAssignmentRepository();
    useCase = new ClaimQueueItemUseCase(queueRepo, assignmentRepo);
  });

  it('claims a WAITING item the judge is assigned to', async () => {
    queueRepo.seed(makeQueueItem({ id: 'q1', problemNumber: 2 }));
    assignmentRepo.seed('judge-1', [2]);

    await useCase.execute('judge-1', 'q1');

    const item = await queueRepo.findById('q1');
    expect(item?.status).toBe('IN_PROGRESS');
    expect(item?.claimedByUserId).toBe('judge-1');
  });

  it('rejects with 404 when the queue item does not exist', async () => {
    await expect(useCase.execute('judge-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects with 403 when the judge is not assigned to this problem number (SPEC §0 item 1)', async () => {
    queueRepo.seed(makeQueueItem({ id: 'q1', problemNumber: 3 }));
    assignmentRepo.seed('judge-1', [1, 2]); // not 3

    await expect(useCase.execute('judge-1', 'q1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects with 409 when the judge already holds another IN_PROGRESS item', async () => {
    queueRepo.seed(makeQueueItem({ id: 'q1', problemNumber: 1 }));
    queueRepo.seed(
      makeQueueItem({
        id: 'q2',
        problemNumber: 1,
        schoolId: 'school-2',
        status: 'IN_PROGRESS',
        claimedByUserId: 'judge-1',
      }),
    );
    assignmentRepo.seed('judge-1', [1]);

    await expect(useCase.execute('judge-1', 'q1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects with 409 when the item was already claimed by someone else', async () => {
    queueRepo.seed(
      makeQueueItem({
        id: 'q1',
        problemNumber: 1,
        status: 'IN_PROGRESS',
        claimedByUserId: 'other-judge',
      }),
    );
    assignmentRepo.seed('judge-1', [1]);

    await expect(useCase.execute('judge-1', 'q1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets a STAFF member claim an item within their (problemNumber, schoolId) delegation scope', async () => {
    queueRepo.seed(makeQueueItem({ id: 'q1', problemNumber: 1, schoolId: 'school-1' }));
    assignmentRepo.seedScope('staff-1', [{ problemNumber: 1, schoolId: 'school-1' }]);

    await useCase.execute('staff-1', 'q1');

    const item = await queueRepo.findById('q1');
    expect(item?.claimedByUserId).toBe('staff-1');
  });

  it('rejects a STAFF member claiming outside their assigned school (SPEC-driven refactor, B4)', async () => {
    queueRepo.seed(makeQueueItem({ id: 'q1', problemNumber: 1, schoolId: 'school-2' }));
    assignmentRepo.seedScope('staff-1', [{ problemNumber: 1, schoolId: 'school-1' }]);

    await expect(useCase.execute('staff-1', 'q1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets a STAFF member with a null-school (all schools) assignment claim any school for that problem', async () => {
    queueRepo.seed(makeQueueItem({ id: 'q1', problemNumber: 4, schoolId: 'school-9' }));
    assignmentRepo.seedScope('staff-1', [{ problemNumber: 4, schoolId: null }]);

    await useCase.execute('staff-1', 'q1');

    expect((await queueRepo.findById('q1'))?.claimedByUserId).toBe('staff-1');
  });

  it('lets exactly one of two judges racing to claim the same WAITING item win (SPEC §0 item 4)', async () => {
    queueRepo.seed(makeQueueItem({ id: 'q1', problemNumber: 1 }));
    assignmentRepo.seed('judge-a', [1]);
    assignmentRepo.seed('judge-b', [1]);

    const results = await Promise.allSettled([
      useCase.execute('judge-a', 'q1'),
      useCase.execute('judge-b', 'q1'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);

    const item = await queueRepo.findById('q1');
    expect(item?.status).toBe('IN_PROGRESS');
    expect(['judge-a', 'judge-b']).toContain(item?.claimedByUserId);
  });

  it('isAdmin=true claims an item with no UserAssignment scope seeded at all', async () => {
    queueRepo.seed(makeQueueItem({ id: 'q1', problemNumber: 5, schoolId: 'school-1' }));

    await useCase.execute('admin-1', 'q1', true);

    expect((await queueRepo.findById('q1'))?.claimedByUserId).toBe('admin-1');
  });

  it('rejects with 409 while the judge’s previous score set still awaits team-leader approval', async () => {
    queueRepo.seed(makeQueueItem({ id: 'q1', problemNumber: 1 }));
    queueRepo.seed(
      makeQueueItem({
        id: 'q-prev',
        problemNumber: 1,
        schoolId: 'school-2',
        status: 'DONE',
        submittedByUserId: 'judge-1',
        approvalStatus: 'PENDING',
      }),
    );
    assignmentRepo.seed('judge-1', [1]);

    await expect(useCase.execute('judge-1', 'q1')).rejects.toBeInstanceOf(ConflictException);
    expect((await queueRepo.findById('q1'))?.status).toBe('WAITING');

    // Approved → free to claim.
    (await queueRepo.findById('q-prev'))!.approvalStatus = 'APPROVED';
    await useCase.execute('judge-1', 'q1');
    expect((await queueRepo.findById('q1'))?.status).toBe('IN_PROGRESS');
  });
});
