import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TransactionRunner } from '../../../database/transaction-runner';
import { AuditLogRepository } from '../../audit-log/audit-log.repository';
import { ScoresRepository } from '../scores.repository';
import { ScoreEditRequestsRepository } from '../score-edit-requests.repository';

export interface ReviewScoreEditRequestInput {
  requestId: string;
  action: 'approve' | 'reject';
  reviewerId: string;
}

/**
 * SPEC §2.5 PATCH /api/admin/score-edit-requests/[id].
 * Approve is the one path outside direct scoring that writes to Score, so
 * it goes through the same TransactionRunner + AuditLog pairing rule as
 * SubmitScoreUseCase (SPEC §1.4). Reject only changes the request's own
 * status — no Score write, so no AuditLog entry either.
 */
@Injectable()
export class ReviewScoreEditRequestUseCase {
  constructor(
    private readonly scoreEditRequestsRepository: ScoreEditRequestsRepository,
    private readonly scoresRepository: ScoresRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: ReviewScoreEditRequestInput): Promise<void> {
    const editRequest = await this.scoreEditRequestsRepository.findById(input.requestId);
    if (!editRequest) {
      throw new NotFoundException('ไม่พบคำขอนี้');
    }
    if (editRequest.status !== 'PENDING') {
      throw new ConflictException('คำขอนี้ถูกดำเนินการไปแล้ว');
    }

    if (input.action === 'reject') {
      await this.scoreEditRequestsRepository.updateStatus(
        input.requestId,
        'REJECTED',
        input.reviewerId,
      );
      return;
    }

    await this.transactionRunner.run(async (tx) => {
      await this.scoresRepository.updateValue(editRequest.scoreId, editRequest.newValue, tx);
      await this.auditLogRepository.create(
        {
          action: 'SCORE_EDIT_APPROVED',
          entityType: 'Score',
          entityId: editRequest.scoreId,
          oldValue: editRequest.oldValue.toFixed(2),
          newValue: editRequest.newValue.toFixed(2),
          performedBy: input.reviewerId,
        },
        tx,
      );
      await this.scoreEditRequestsRepository.updateStatus(
        input.requestId,
        'APPROVED',
        input.reviewerId,
        tx,
      );
    });
  }
}
