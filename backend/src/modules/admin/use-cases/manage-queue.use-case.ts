import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
      return; 
    }

    const neighbour = siblings[neighbourIndex];
    const itemPosition = item.position;
    const neighbourPosition = neighbour.position;
    await this.queueRepository.updatePosition(item.id, neighbourPosition);
    await this.queueRepository.updatePosition(neighbour.id, itemPosition);
  }

  /**
   * Full admin edit — school, problem and exam time together (Bangkok
   * local, no DST), per the queue-management flow diagram: fetch the item,
   * show it pre-filled, let the admin change anything, validate, save.
   * Only WAITING items (editing a claimed/finished item would falsify the
   * record — same restriction as the old time-only edit and as Skip Queue).
   * Moving an item to a different problem appends it to that problem's
   * queue (same placement `create` uses); staying on the same problem keeps
   * its existing Position (only the school/time changed).
   */
  async update(
    id: string,
    input: { schoolId: string; problemNumber: number; date: string; time: string },
  ): Promise<QueueItem> {
    const item = await this.queueRepository.findById(id);
    if (!item) {
      throw new NotFoundException('ไม่พบรายการคิวนี้');
    }
    if (item.status !== 'WAITING') {
      throw new ConflictException('แก้ไขได้เฉพาะรายการที่ยังรอตรวจ');
    }

    const scheduledAt = new Date(`${input.date}T${input.time}:00+07:00`);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('รูปแบบวันที่หรือเวลาไม่ถูกต้อง');
    }

    const cellChanged = item.schoolId !== input.schoolId || item.problemNumber !== input.problemNumber;
    if (cellChanged) {
      const duplicate = await this.queueRepository.existsForSchoolAndProblem(
        input.schoolId,
        input.problemNumber,
      );
      if (duplicate) {
        throw new ConflictException('ศูนย์นี้มีข้อนี้ในคิวแล้ว');
      }
    }

    const position =
      item.problemNumber !== input.problemNumber
        ? (await this.queueRepository.findByProblemNumbersWithSchool([input.problemNumber])).length
        : item.position;

    await this.queueRepository.updateDetails(id, {
      schoolId: input.schoolId,
      problemNumber: input.problemNumber,
      position,
      scheduledAt,
    });

    return { ...item, schoolId: input.schoolId, problemNumber: input.problemNumber, position, scheduledAt };
  }

  async remove(id: string): Promise<void> {
    await this.queueRepository.delete(id);
  }
}
