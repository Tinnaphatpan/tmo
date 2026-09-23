import { BadRequestException, Injectable } from '@nestjs/common';
import { FileStorage } from '../../common/file-storage';
import { UsersRepository } from '../users/users.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { StudentsRepository } from '../students/students.repository';
import { ScoresRepository } from '../scores/scores.repository';
import { buildScoreSheetPdf } from './score-sheet.pdf-builder';

export interface GenerateScoreSheetInput {
  queueItemId: string;
  schoolId: string;
  problemNumber: number;
  submittedByUserId: string;
  approvedByUserId: string;
}

/**
 * Shared by ApproveScoreSetUseCase (first approval) and
 * ReviewScoreEditRequestUseCase (regenerating after a score revision) — both
 * need to assemble the exact same signed PDF from a QueueItem's current
 * state, just at different points in the approval lifecycle.
 */
@Injectable()
export class ScoreSheetGenerator {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly schoolsRepository: SchoolsRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly scoresRepository: ScoresRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async generateAndSave(input: GenerateScoreSheetInput): Promise<string> {
    const submitter = await this.usersRepository.findById(input.submittedByUserId);
    const approver = await this.usersRepository.findById(input.approvedByUserId);
    if (!submitter?.signaturePath || !approver?.signaturePath) {
      throw new BadRequestException(
        'ต้องอัปโหลดลายเซ็นของกรรมการและอาจารย์ผู้ควบคุมทีมก่อนจึงจะอนุมัติได้',
      );
    }

    const [school, students, scores, submitterSignature, approverSignature] = await Promise.all([
      this.schoolsRepository.findById(input.schoolId),
      this.studentsRepository.findBySchool(input.schoolId),
      this.scoresRepository.findByQueueItem(input.queueItemId),
      this.fileStorage.readFile(submitter.signaturePath),
      this.fileStorage.readFile(approver.signaturePath),
    ]);

    const pdfBuffer = await buildScoreSheetPdf({
      schoolName: school?.name ?? '',
      schoolCode: school?.code ?? null,
      problemNumber: input.problemNumber,
      students,
      scores,
      submitter: { displayName: submitter.displayName, signatureImage: submitterSignature },
      approver: { displayName: approver.displayName, signatureImage: approverSignature },
      approvedAt: new Date(),
    });

    return this.fileStorage.savePdf(`${input.queueItemId}.pdf`, pdfBuffer);
  }
}
