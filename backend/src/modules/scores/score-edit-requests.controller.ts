import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../domain/entities';
import { CreateScoreEditRequestUseCase } from './use-cases/create-score-edit-request.use-case';
import { CreateScoreEditRequestDto } from './dto/create-score-edit-request.dto';

// SPEC §2.5 POST /api/score-edit-requests. STAFF included since B4: a STAFF
// member who entered a score under their own identity may request its
// correction the same as a COMMITTEE member (ownership still enforced in
// CreateScoreEditRequestUseCase via Score.JudgeId, role-agnostic).
@Controller('score-edit-requests')
@UseGuards(AuthGuard, RolesGuard)
@Roles('COMMITTEE', 'STAFF')
export class ScoreEditRequestsController {
  constructor(private readonly createUseCase: CreateScoreEditRequestUseCase) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateScoreEditRequestDto) {
    const request = await this.createUseCase.execute({
      scoreId: dto.scoreId,
      judgeId: user.id,
      newValue: dto.newValue,
      reason: dto.reason,
    });
    return { id: request.id };
  }
}
