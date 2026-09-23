import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FileStorage } from '../../../common/file-storage';
import { QueueRepository } from '../../queue/queue.repository';
import { UsersRepository } from '../../users/users.repository';
import { SchoolsRepository } from '../../schools/schools.repository';
import { StudentsRepository } from '../../students/students.repository';
import { ScoresRepository } from '../../scores/scores.repository';
import { TransactionRunner } from '../../../database/transaction-runner';
import { buildScoreSheetPdf } from '../score-sheet.pdf-builder';

export interface ApproveScoreSetInput {
  queueItemId: string;
  teamLeaderId: string;
}

/**
 * TEAM_LEADER approval of a school's pending score set. School-scoped the
 * same way GetTeamLeaderReportUseCase is (never trust a client-supplied
 * schoolId — always the caller's own DB-reloaded `User.schoolId`). On
 * approve, generates the score-sheet PDF (both signatures + server
 * timestamp) and stores it via FileStorage.
 */
@Injectable()
export class ApproveScoreSetUseCase {
  constructor(
    private readonly queueRepository: QueueRepository,
    private readonly usersRepository: UsersRepository,
    private readonly schoolsRepository: SchoolsRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly scoresRepository: ScoresRepository,
    private readonly transactionRunner: TransactionRunner,
    private readonly fileStorage: FileStorage,
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

    const [school, students, scores, submitterSignature, approverSignature] = await Promise.all([
      this.schoolsRepository.findById(item.schoolId),
      this.studentsRepository.findBySchool(item.schoolId),
      this.scoresRepository.findByQueueItem(input.queueItemId),
      this.fileStorage.readFile(submitter.signaturePath),
      this.fileStorage.readFile(teamLeader.signaturePath),
    ]);

    const approvedAt = new Date();
    const pdfBuffer = await buildScoreSheetPdf({
      schoolName: school?.name ?? '',
      schoolCode: school?.code ?? null,
      problemNumber: item.problemNumber,
      students,
      scores,
      submitter: { displayName: submitter.displayName, signatureImage: submitterSignature },
      approver: { displayName: teamLeader.displayName, signatureImage: approverSignature },
      approvedAt,
    });
    const documentPath = await this.fileStorage.savePdf(`${input.queueItemId}.pdf`, pdfBuffer);

    await this.transactionRunner.run(async (tx) => {
      await this.queueRepository.approve(input.queueItemId, input.teamLeaderId, documentPath, tx);
    });
  }
}
