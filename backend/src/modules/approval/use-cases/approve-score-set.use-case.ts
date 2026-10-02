import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { QueueRepository } from '../../queue/queue.repository';
import { UsersRepository } from '../../users/users.repository';
import { TransactionRunner } from '../../../database/transaction-runner';
import { ScoreSheetGenerator } from '../score-sheet-generator';

export interface ApproveScoreSetInput {
  queueItemId: string;
  teamLeaderId: string;
  /** ADMIN override (admin/approvals): skips the same-school ownership check
   * a TEAM_LEADER is held to — an admin may approve any school's pending set.
   * The PDF still ends up signed by whichever account actually approved it
   * (never a nominal team leader), consistent with the STAFF-attribution rule. */
  isAdmin?: boolean;
}

/**
 * TEAM_LEADER approval of a school's pending score set. School-scoped the
 * same way GetTeamLeaderReportUseCase is (never trust a client-supplied
 * schoolId — always the caller's own DB-reloaded `User.schoolId`), unless
 * the caller is ADMIN (see isAdmin above). On approve, generates the
 * score-sheet PDF (both signatures + server timestamp) via ScoreSheetGenerator.
 */
@Injectable()
export class ApproveScoreSetUseCase {
  constructor(
    private readonly queueRepository: QueueRepository,
    private readonly usersRepository: UsersRepository,
    private readonly scoreSheetGenerator: ScoreSheetGenerator,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: ApproveScoreSetInput): Promise<void> {
    const item = await this.queueRepository.findById(input.queueItemId);
    if (!item) {
      throw new NotFoundException('ไม่พบรายการคิวนี้');
    }

    const teamLeader = await this.usersRepository.findById(input.teamLeaderId);
    if (!teamLeader) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์อนุมัติคะแนนของศูนย์นี้');
    }
    if (!input.isAdmin && item.schoolId !== teamLeader.schoolId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์อนุมัติคะแนนของศูนย์นี้');
    }

    if (item.approvalStatus !== 'PENDING') {
      throw new ConflictException('รายการนี้ไม่ได้อยู่ในสถานะรออนุมัติ');
    }

    const documentPath = await this.scoreSheetGenerator.generateAndSave({
      queueItemId: input.queueItemId,
      schoolId: item.schoolId,
      problemNumber: item.problemNumber,
      submittedByUserId: item.submittedByUserId!,
      approvedByUserId: input.teamLeaderId,
    });

    await this.transactionRunner.run(async (tx) => {
      await this.queueRepository.approve(input.queueItemId, input.teamLeaderId, documentPath, tx);
    });
  }
}
