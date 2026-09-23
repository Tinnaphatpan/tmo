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

// SPEC §2.5 / §5.4 — /api/admin/score-edit-requests (ADMIN only).
@Controller('admin/score-edit-requests')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminScoreEditRequestsController {
  constructor(
    private readonly scoreEditRequestsRepository: ScoreEditRequestsRepository,
    private readonly reviewUseCase: ReviewScoreEditRequestUseCase,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Get()
  list() {
    return this.scoreEditRequestsRepository.findAllWithContext();
  }

  @Patch(':id')
  async review(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReviewScoreEditRequestDto,
  ) {
    await this.reviewUseCase.execute({ requestId: id, action: dto.action, reviewerId: user.id });
    this.realtimeService.notifyChange();
    return { ok: true };
  }
}
