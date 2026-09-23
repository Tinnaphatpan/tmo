import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../domain/entities';
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
  ) {}

  @Get()
  listPending(@CurrentUser() user: User) {
    return this.queueRepository.findPendingApprovalBySchool(user.schoolId!);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: User) {
    return this.approveScoreSet.execute({ queueItemId: id, teamLeaderId: user.id });
  }
}
