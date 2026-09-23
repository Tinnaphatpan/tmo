import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TransactionRunner } from '../../../database/transaction-runner';
import { AuditLogRepository } from '../../audit-log/audit-log.repository';
import { ScoresRepository } from '../scores.repository';
import { ScoreEditRequestsRepository } from '../score-edit-requests.repository';
import { QueueRepository } from '../../queue/queue.repository';
import { ScoreSheetGenerator } from '../../approval/score-sheet-generator';

export interface ReviewScoreEditRequestInput {
  requestId: string;
  action: 'approve' | 'reject';
  reviewerId: string;
  /** The reviewing TEAM_LEADER's own school — never trust a client-supplied
   * schoolId, always the caller's DB-reloaded User.schoolId (SPEC §4.4). */
  reviewerSchoolId: string;
}

/**
 * TEAM_LEADER-only, school-scoped (moved off ADMIN — a school's own team
 * leader reviews its own edit requests, not a global admin). Approve is the
 * one path outside direct scoring that writes to Score, so it goes through
 * the same TransactionRunner + AuditLog pairing rule as SubmitScoreUseCase
 * (SPEC §1.4). Reject only changes the request's own status — no Score
 * write, so no AuditLog entry either.
 *
 * If the QueueItem this score belongs to was already approved (has a PDF on
 * file), approving the edit regenerates that PDF with the corrected value —
 * a silent overwrite, keeping the original ApprovedByUserId/ApprovedAt
 * (the same team leader's sign-off still stands; only the value changed).
 */
@Injectable()
export class ReviewScoreEditRequestUseCase {
  constructor(
    private readonly scoreEditRequestsRepository: ScoreEditRequestsRepository,
    private readonly scoresRepository: ScoresRepository,
    private readonly queueRepository: QueueRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly scoreSheetGenerator: ScoreSheetGenerator,
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

    const score = await this.scoresRepository.findById(editRequest.scoreId);
    if (!score) {
      throw new NotFoundException('ไม่พบคะแนนนี้');
    }
    const queueItem = await this.queueRepository.findById(score.queueItemId);
    if (!queueItem) {
      throw new NotFoundException('ไม่พบรายการคิวนี้');
    }
    if (queueItem.schoolId !== input.reviewerSchoolId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์พิจารณาคำขอแก้ไขคะแนนของศูนย์นี้');
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

    const alreadyApproved = queueItem.approvalStatus === 'APPROVED' && !!queueItem.documentPath;
    if (alreadyApproved) {
      // Regenerated after the transaction commits, so it reads the new
      // value — not wrapped in the same transaction since PDF generation is
      // file I/O, not a DB write (see SPEC §1.4's Score+AuditLog pairing,
      // which this doesn't fall under: the document is a derived artifact).
      const newDocumentPath = await this.scoreSheetGenerator.generateAndSave({
        queueItemId: queueItem.id,
        schoolId: queueItem.schoolId,
        problemNumber: queueItem.problemNumber,
        submittedByUserId: queueItem.submittedByUserId!,
        approvedByUserId: queueItem.approvedByUserId!,
      });
      await this.queueRepository.updateDocumentPath(queueItem.id, newDocumentPath);
    }
  }
}
