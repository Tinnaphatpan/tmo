import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QueueRepository } from '../queue.repository';

export interface SkipQueueItemInput {
  queueItemId: string;
  userId: string;
}

/**
 * Skip = release the held item back to WAITING and move it to the end of that
 * problem's queue (Position = max sibling Position + 1). No new QueueItem
 * status — the public schedule groups by ScheduledAt, never Position, so this
 * can't desync the rotation display.
 */
@Injectable()
export class SkipQueueItemUseCase {
  constructor(private readonly queueRepository: QueueRepository) {}

  async execute(input: SkipQueueItemInput): Promise<void> {
    const item = await this.queueRepository.findById(input.queueItemId);
    if (!item) {
      throw new NotFoundException('ไม่พบรายการคิวนี้');
    }
    if (item.status !== 'IN_PROGRESS' || item.claimedByUserId !== input.userId) {
      throw new ConflictException('คุณไม่ได้ถือคิวนี้อยู่');
    }

    const siblings = await this.queueRepository.findByProblemNumbersWithSchool([
      item.problemNumber,
    ]);
    const maxPosition = siblings.reduce((max, s) => Math.max(max, s.position), item.position);

    await this.queueRepository.release(item.id);
    await this.queueRepository.updatePosition(item.id, maxPosition + 1);
  }
}
