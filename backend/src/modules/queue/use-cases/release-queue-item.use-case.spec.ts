import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReleaseQueueItemUseCase } from './release-queue-item.use-case';
import { FakeQueueRepository, makeQueueItem } from '../../../testing/fake-queue.repository';

describe('ReleaseQueueItemUseCase', () => {
  let queueRepo: FakeQueueRepository;
  let useCase: ReleaseQueueItemUseCase;

  beforeEach(() => {
    queueRepo = new FakeQueueRepository();
    useCase = new ReleaseQueueItemUseCase(queueRepo);
    queueRepo.seed(
      makeQueueItem({ id: 'q1', status: 'IN_PROGRESS', claimedByUserId: 'u1', position: 3 }),
    );
  });

  it('owner releases their own item back to WAITING, position untouched', async () => {
    await useCase.execute({ queueItemId: 'q1', userId: 'u1', isAdmin: false });
    expect(await queueRepo.findById('q1')).toMatchObject({
      status: 'WAITING',
      claimedByUserId: null,
      claimedAt: null,
      position: 3,
    });
  });

  it('409 for a non-owner', async () => {
    await expect(
      useCase.execute({ queueItemId: 'q1', userId: 'u2', isAdmin: false }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ADMIN force-releases regardless of owner', async () => {
    await useCase.execute({ queueItemId: 'q1', userId: 'admin', isAdmin: true });
    expect((await queueRepo.findById('q1'))?.status).toBe('WAITING');
  });

  it('404 for a missing item', async () => {
    await expect(
      useCase.execute({ queueItemId: 'nope', userId: 'u1', isAdmin: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
