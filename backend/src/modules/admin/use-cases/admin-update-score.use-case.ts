import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionRunner } from '../../../database/transaction-runner';
import { AuditLogRepository } from '../../audit-log/audit-log.repository';
import { ScoresRepository } from '../../scores/scores.repository';
import { QueueRepository } from '../../queue/queue.repository';
import { ScoreSheetGenerator } from '../../approval/score-sheet-generator';

export interface AdminUpdateScoreInput {
  scoreId: string;
  value: number;
  adminId: string;
}

/**
 * ADMIN-only direct score correction from the "ดูคะแนน" (all scores) page —
 * writes straight to Score, bypassing the ScoreEditRequest/TEAM_LEADER
 * re-approval workflow that COMMITTEE/STAFF/TEAM_LEADER go through
 * (score-edit-requests module). Confirmed with the requester: an admin fix
 * here needs no one else's sign-off. It's still fully accounted for —
 * AuditLog action `ADMIN_SCORE_OVERRIDE` (distinct from the judge's own
 * `SCORE_UPDATED` and the normal `SCORE_EDIT_APPROVED`) records who changed
 * what and when, same as every other Score write (SPEC §1.4).
 */
@Injectable()
export class AdminUpdateScoreUseCase {
  constructor(
    private readonly scoresRepository: ScoresRepository,
    private readonly queueRepository: QueueRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly scoreSheetGenerator: ScoreSheetGenerator,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: AdminUpdateScoreInput): Promise<void> {
    const score = await this.scoresRepository.findById(input.scoreId);
    if (!score) {
      throw new NotFoundException('ไม่พบคะแนนนี้');
    }
    // Captured before the write below — a fake/in-memory ScoresRepository
    // may hand back the same object it mutates in place, so reading
    // score.value *after* updateValue would silently pick up the new value.
    const oldValue = score.value;

    await this.transactionRunner.run(async (tx) => {
      await this.scoresRepository.updateValue(input.scoreId, input.value, tx);
      await this.auditLogRepository.create(
        {
          action: 'ADMIN_SCORE_OVERRIDE',
          entityType: 'Score',
          entityId: input.scoreId,
          oldValue: oldValue.toFixed(2),
          newValue: input.value.toFixed(2),
          performedBy: input.adminId,
        },
        tx,
      );
    });

    // Already-approved item -> its PDF is now stale; regenerate it (same
    // pattern as ReviewScoreEditRequestUseCase), keeping the original
    // ApprovedByUserId/ApprovedAt — only the value on the sheet changes.
    const queueItem = await this.queueRepository.findById(score.queueItemId);
    const alreadyApproved = queueItem?.approvalStatus === 'APPROVED' && !!queueItem.documentPath;
    if (queueItem && alreadyApproved) {
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
