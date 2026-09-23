import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../domain/entities';
import { ScoreEditRequestsRepository } from '../scores/score-edit-requests.repository';
import { ReviewScoreEditRequestUseCase } from '../scores/use-cases/review-score-edit-request.use-case';
import { RealtimeService } from '../realtime/realtime.service';
import { ReviewScoreEditRequestDto } from '../scores/dto/review-score-edit-request.dto';

// TEAM_LEADER only, scoped to their own school — moved off ADMIN so a
// school's own team leader reviews its own edit requests (SPEC §4.4 IDOR
// guard enforced inside ReviewScoreEditRequestUseCase).
@Controller('team-leader/score-edit-requests')
@UseGuards(AuthGuard, RolesGuard)
@Roles('TEAM_LEADER')
export class TeamLeaderScoreEditRequestsController {
  constructor(
    private readonly scoreEditRequestsRepository: ScoreEditRequestsRepository,
    private readonly reviewUseCase: ReviewScoreEditRequestUseCase,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.scoreEditRequestsRepository.findBySchoolWithContext(user.schoolId!);
  }

  @Patch(':id')
  async review(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReviewScoreEditRequestDto,
  ) {
    await this.reviewUseCase.execute({
      requestId: id,
      action: dto.action,
      reviewerId: user.id,
      reviewerSchoolId: user.schoolId!,
    });
    this.realtimeService.notifyChange();
    return { ok: true };
  }
}
