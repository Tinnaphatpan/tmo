import {
  Controller,
  ForbiddenException,
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
import { ApproveScoreSetUseCase } from './use-cases/approve-score-set.use-case';

// Score approval workflow — TEAM_LEADER only, scoped to their own school
// (`user.schoolId` from the JWT-verified, DB-reloaded User; SPEC §4.4's IDOR warning).
@Controller('team-leader/approvals')
@UseGuards(AuthGuard, RolesGuard)
@Roles('TEAM_LEADER')
export class ApprovalController {
  constructor(
    private readonly queueRepository: QueueRepository,
    private readonly approveScoreSet: ApproveScoreSetUseCase,
    private readonly fileStorage: FileStorage,
  ) {}

  @Get()
  listPending(@CurrentUser() user: User) {
    return this.queueRepository.findPendingApprovalBySchool(user.schoolId!);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: User) {
    return this.approveScoreSet.execute({ queueItemId: id, teamLeaderId: user.id });
  }

  @Get(':id/document')
  async document(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    const item = await this.queueRepository.findById(id);
    if (!item) throw new NotFoundException('ไม่พบรายการคิวนี้');
    if (item.schoolId !== user.schoolId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึงเอกสารของศูนย์นี้');
    }
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
