import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../domain/entities';
import { contentDispositionFilename } from '../../common/csv';
import { FileStorage } from '../../common/file-storage';
import { QueueRepository } from '../queue/queue.repository';
import { ScoresRepository } from '../scores/scores.repository';
import { StudentsRepository } from '../students/students.repository';
import { ApproveScoreSetUseCase } from '../approval/use-cases/approve-score-set.use-case';

/**
 * ADMIN override of the TEAM_LEADER approval workflow (`team-leader/approvals`).
 * Not school-scoped — lists and approves pending score sets for every
 * school, for when a team leader is unavailable to sign off. Approving here
 * still runs the normal ApproveScoreSetUseCase/ScoreSheetGenerator path, so
 * the PDF requires the admin's own uploaded signature and is signed as the
 * admin, never as a stand-in team leader (same attribution rule as STAFF
 * submissions — see CLAUDE.md decision 4).
 */
@Controller('admin/approvals')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminApprovalsController {
  constructor(
    private readonly queueRepository: QueueRepository,
    private readonly approveScoreSet: ApproveScoreSetUseCase,
    private readonly fileStorage: FileStorage,
    private readonly scoresRepository: ScoresRepository,
    private readonly studentsRepository: StudentsRepository,
  ) {}

  @Get()
  async listPending() {
    const items = await this.queueRepository.findAllPendingApproval();
    if (items.length === 0) return items;

    const [allStudents, allScores] = await Promise.all([
      this.studentsRepository.findBySchools([...new Set(items.map((i) => i.schoolId))]),
      this.scoresRepository.findByQueueItems(items.map((i) => i.id)),
    ]);
    const rosterBySchool = new Map<string, typeof allStudents>();
    for (const s of allStudents) {
      const list = rosterBySchool.get(s.schoolId) ?? [];
      list.push(s);
      rosterBySchool.set(s.schoolId, list);
    }

    return items.map((item) => {
      const roster = [...(rosterBySchool.get(item.schoolId) ?? [])].sort(
        (a, b) => a.seqNo - b.seqNo,
      );
      return {
        id: item.id,
        problemNumber: item.problemNumber,
        schoolName: item.schoolName,
        schoolCode: item.schoolCode,
        scores: roster.map((student) => {
          const score = allScores.find(
            (sc) => sc.queueItemId === item.id && sc.studentId === student.id,
          );
          return {
            scoreId: score?.id ?? null,
            studentCode: student.studentCode,
            studentName: student.name,
            value: score?.value ?? null,
          };
        }),
      };
    });
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: User) {
    return this.approveScoreSet.execute({ queueItemId: id, teamLeaderId: user.id, isAdmin: true });
  }

  @Get(':id/document')
  async document(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const item = await this.queueRepository.findById(id);
    if (!item) throw new NotFoundException('ไม่พบรายการคิวนี้');
    if (!item.documentPath) throw new NotFoundException('ยังไม่มีเอกสารสำหรับรายการนี้');

    const buffer = await this.fileStorage.readFile(item.documentPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      contentDispositionFilename(`tmo-score-sheet-${item.problemNumber}.pdf`),
    );
    res.send(buffer);
  }
}
