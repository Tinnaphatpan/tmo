import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserAssignmentRepository } from '../../user-assignment/user-assignment.repository';
import { QueueRepository } from '../queue.repository';

/**
 * SPEC §2.5/§2.6 — POST /api/queue/[id]/claim
 * Order of checks matches the spec's documented error precedence:
 *   403 not assigned this problem → 409 already holding another item →
 *   409 lost the race to another judge.
 *
 * Scope check works unchanged for both COMMITTEE and STAFF: COMMITTEE's
 * UserAssignment rows always have SchoolId=null (any school, that problem
 * number — today's original semantics), while STAFF may have a non-null
 * SchoolId restricting them to one school for that problem number. No
 * role branching needed — just match on (problemNumber, schoolId-or-null).
 */
@Injectable()
export class ClaimQueueItemUseCase {
  constructor(
    private readonly queueRepository: QueueRepository,
    private readonly userAssignmentRepository: UserAssignmentRepository,
  ) {}

  async execute(userId: string, queueItemId: string): Promise<void> {
    const item = await this.queueRepository.findById(queueItemId);
    if (!item) {
      throw new NotFoundException('ไม่พบรายการคิวนี้');
    }

    const scope = await this.userAssignmentRepository.findScopeByUser(userId);
    const isAssigned = scope.some(
      (s) => s.problemNumber === item.problemNumber && (s.schoolId === null || s.schoolId === item.schoolId),
    );
    if (!isAssigned) {
      throw new ForbiddenException('คุณไม่ได้รับมอบหมายให้ตรวจข้อนี้');
    }

    const activeClaim = await this.queueRepository.findActiveClaimByUser(userId);
    if (activeClaim) {
      throw new ConflictException('คุณกำลังตรวจอีกรายการอยู่ กรุณาส่งคะแนนหรือคืนคิวก่อน');
    }

    // The real race guard: an atomic conditional UPDATE at the DB layer
    // (WHERE Status='WAITING' AND ClaimedByUserId IS NULL). Everything above
    // is just producing a friendlier error for the common case — this call
    // is what actually decides who wins when two judges click at once.
    const claimed = await this.queueRepository.claim(queueItemId, userId);
    if (!claimed) {
      throw new ConflictException('รายการนี้ถูกกรรมการท่านอื่นรับตรวจไปแล้ว');
    }
  }
}
