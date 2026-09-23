import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QueueItem } from '../../../domain/entities';
import { QueueRepository } from '../../queue/queue.repository';

/** SPEC §2.5 — POST/PATCH/DELETE /api/admin/queue. */
@Injectable()
export class ManageQueueUseCase {
  constructor(private readonly queueRepository: QueueRepository) {}

  async create(schoolId: string, problemNumber: number): Promise<QueueItem> {
    const exists = await this.queueRepository.existsForSchoolAndProblem(schoolId, problemNumber);
    if (exists) {
      throw new ConflictException('ศูนย์นี้มีข้อนี้ในคิวแล้ว');
    }
    const siblings = await this.queueRepository.findByProblemNumbersWithSchool([problemNumber]);
    return this.queueRepository.create({
      schoolId,
      problemNumber,
      position: siblings.length,
      scheduledAt: null,
    });
  }

  /** Swaps Position with the nearest neighbour within the same problem's ordering. */
  async move(id: string, direction: 'up' | 'down'): Promise<void> {
    const item = await this.queueRepository.findById(id);
    if (!item) {
      throw new NotFoundException('ไม่พบรายการคิวนี้');
    }

    const siblings = (
      await this.queueRepository.findByProblemNumbersWithSchool([item.problemNumber])
    ).sort((a, b) => a.position - b.position);
    const index = siblings.findIndex((s) => s.id === id);
    const neighbourIndex = direction === 'up' ? index - 1 : index + 1;
    if (neighbourIndex < 0 || neighbourIndex >= siblings.length) {
      return; // already at the boundary — no-op, not an error
    }

    const neighbour = siblings[neighbourIndex];
    const itemPosition = item.position;
    const neighbourPosition = neighbour.position;
    await this.queueRepository.updatePosition(item.id, neighbourPosition);
    await this.queueRepository.updatePosition(neighbour.id, itemPosition);
  }

  async remove(id: string): Promise<void> {
    await this.queueRepository.delete(id);
  }
}
