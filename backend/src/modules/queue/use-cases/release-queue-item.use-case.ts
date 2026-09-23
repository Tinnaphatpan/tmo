import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QueueRepository } from '../queue.repository';

export interface ReleaseQueueItemInput {
  queueItemId: string;
  userId: string;
  /** ADMIN callers force-release regardless of ownership (SPEC §2.5, admin row). */
  isAdmin: boolean;
}

@Injectable()
export class ReleaseQueueItemUseCase {
  constructor(private readonly queueRepository: QueueRepository) {}

  async execute(input: ReleaseQueueItemInput): Promise<void> {
    const item = await this.queueRepository.findById(input.queueItemId);
    if (!item) {
      throw new NotFoundException('ไม่พบรายการคิวนี้');
    }

    if (!input.isAdmin) {
      const isOwner = item.status === 'IN_PROGRESS' && item.claimedByUserId === input.userId;
      if (!isOwner) {
        throw new ConflictException('คุณไม่ได้ถือคิวนี้อยู่');
      }
    }

    await this.queueRepository.release(input.queueItemId);
  }
}
