import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TransactionRunner } from '../../../database/transaction-runner';
import { AuditLogRepository } from '../../audit-log/audit-log.repository';
import { ScoresRepository } from '../scores.repository';
import { ScoreEditRequestsRepository } from '../score-edit-requests.repository';
import { QueueRepository } from '../../queue/queue.repository';
import { ScoreSheetGenerator } from '../../approval/score-sheet-generator';
import { UsersRepository } from '../../users/users.repository';
import { UserAssignmentRepository } from '../../user-assignment/user-assignment.repository';
import { Role } from '../../../domain/entities';

export interface ReviewScoreEditRequestInput {
  requestId: string;
  action: 'approve' | 'reject';
  reviewerId: string;
  /** Omitted = TEAM_LEADER (the original reviewer). COMMITTEE/STAFF review
   * requests raised by a team leader for the problem they are assigned to. */
  reviewerRole?: Role;
  /** The reviewing TEAM_LEADER's own school — never trust a client-supplied
   * schoolId, always the caller's DB-reloaded User.schoolId (SPEC §4.4). */
  reviewerSchoolId?: string | null;
}

/**
 * A school's TEAM_LEADER reviews edit requests raised by that school's judges
 * (moved off ADMIN); requests raised by the TEAM_LEADER themselves are reviewed
 * by the COMMITTEE/STAFF assigned to that problem. Approve is the
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
    private readonly usersRepository: UsersRepository,
    private readonly userAssignmentRepository: UserAssignmentRepository,
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
    const requester = await this.usersRepository.findById(editRequest.requestedBy);
    const requestedByTeamLeader = requester?.role === 'TEAM_LEADER';

    if ((input.reviewerRole ?? 'TEAM_LEADER') === 'TEAM_LEADER') {
      if (queueItem.schoolId !== input.reviewerSchoolId) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์พิจารณาคำขอแก้ไขคะแนนของศูนย์นี้');
      }
      if (requestedByTeamLeader) {
        // Mentor-raised requests are checked by the judge who scored the problem.
        throw new ForbiddenException('คำขอจากหัวหน้าทีมต้องให้กรรมการประจำข้อพิจารณา');
      }
    } else {
      const scope = await this.userAssignmentRepository.findScopeByUser(input.reviewerId);
      const inScope = scope.some(
        (sc) =>
          sc.problemNumber === queueItem.problemNumber &&
          (sc.schoolId === null || sc.schoolId === queueItem.schoolId),
      );
      if (!inScope || !requestedByTeamLeader) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์พิจารณาคำขอแก้ไขคะแนนนี้');
      }
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
          changes: [
            {
              fieldName: 'value',
              oldValue: editRequest.oldValue.toFixed(2),
              newValue: editRequest.newValue.toFixed(2),
            },
          ],
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
