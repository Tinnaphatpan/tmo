import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueueRepository } from '../../queue/queue.repository';
import { UsersRepository } from '../../users/users.repository';
import { TransactionRunner } from '../../../database/transaction-runner';

export interface ApproveScoreSetInput {
  queueItemId: string;
  teamLeaderId: string;
}

/**
 * TEAM_LEADER approval of a school's pending score set. School-scoped the
 * same way GetMentorReportUseCase/GetTeamLeaderReportUseCase is (never trust
 * a client-supplied schoolId — always the caller's own DB-reloaded
 * `User.schoolId`). Signature check + PDF generation land together in a
 * later phase (once pdfkit + the signature-upload endpoint exist) —
 * `documentPath` is left null here.
 */
@Injectable()
export class ApproveScoreSetUseCase {
  constructor(
    private readonly queueRepository: QueueRepository,
    private readonly usersRepository: UsersRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: ApproveScoreSetInput): Promise<void> {
    const item = await this.queueRepository.findById(input.queueItemId);
    if (!item) {
      throw new NotFoundException('ไม่พบรายการคิวนี้');
    }

    const teamLeader = await this.usersRepository.findById(input.teamLeaderId);
    if (!teamLeader || item.schoolId !== teamLeader.schoolId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์อนุมัติคะแนนของศูนย์นี้');
    }

    if (item.approvalStatus !== 'PENDING') {
      throw new ConflictException('รายการนี้ไม่ได้อยู่ในสถานะรออนุมัติ');
    }

    const submitter = item.submittedByUserId
      ? await this.usersRepository.findById(item.submittedByUserId)
      : null;
    if (!submitter?.signaturePath || !teamLeader.signaturePath) {
      throw new BadRequestException(
        'ต้องอัปโหลดลายเซ็นของกรรมการและอาจารย์ผู้ควบคุมทีมก่อนจึงจะอนุมัติได้',
      );
    }

    await this.transactionRunner.run(async (tx) => {
      // documentPath stays null until PDF generation lands (needs pdfkit).
      await this.queueRepository.approve(input.queueItemId, input.teamLeaderId, null, tx);
    });
  }
}
