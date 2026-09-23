import { ConflictException, NotFoundException } from '@nestjs/common';
import { SkipQueueItemUseCase } from './skip-queue-item.use-case';
import { FakeQueueRepository, makeQueueItem } from '../../../testing/fake-queue.repository';

describe('SkipQueueItemUseCase', () => {
  let queueRepo: FakeQueueRepository;
  let useCase: SkipQueueItemUseCase;

  beforeEach(() => {
    queueRepo = new FakeQueueRepository();
    useCase = new SkipQueueItemUseCase(queueRepo);
  });

  it('releases the item and moves it to the end of its problem queue', async () => {
    queueRepo.seed(
      makeQueueItem({
        id: 'q1',
        problemNumber: 1,
        position: 0,
        status: 'IN_PROGRESS',
        claimedByUserId: 'u1',
      }),
    );
    queueRepo.seed(makeQueueItem({ id: 'q2', problemNumber: 1, position: 1, schoolId: 's2' }));
    queueRepo.seed(makeQueueItem({ id: 'q3', problemNumber: 1, position: 2, schoolId: 's3' }));
    queueRepo.seed(makeQueueItem({ id: 'q4', problemNumber: 2, position: 9, schoolId: 's4' }));

    await useCase.execute({ queueItemId: 'q1', userId: 'u1' });

    const item = await queueRepo.findById('q1');
    expect(item?.status).toBe('WAITING');
    expect(item?.claimedByUserId).toBeNull();
    expect(item?.position).toBe(3); // other problems' positions are ignored
  });

  it('404s when the item does not exist', async () => {
    await expect(useCase.execute({ queueItemId: 'x', userId: 'u1' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('409s when the caller does not hold the item', async () => {
    queueRepo.seed(
      makeQueueItem({ id: 'q1', status: 'IN_PROGRESS', claimedByUserId: 'someone-else' }),
    );
    await expect(useCase.execute({ queueItemId: 'q1', userId: 'u1' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('409s when the item is still WAITING', async () => {
    queueRepo.seed(makeQueueItem({ id: 'q1' }));
    await expect(useCase.execute({ queueItemId: 'q1', userId: 'u1' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
