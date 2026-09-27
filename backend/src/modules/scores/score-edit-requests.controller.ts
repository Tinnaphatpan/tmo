import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../domain/entities';
import { UserAssignmentRepository } from '../user-assignment/user-assignment.repository';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateScoreEditRequestUseCase } from './use-cases/create-score-edit-request.use-case';
import { ReviewScoreEditRequestUseCase } from './use-cases/review-score-edit-request.use-case';
import { CreateScoreEditRequestDto } from './dto/create-score-edit-request.dto';
import { ReviewScoreEditRequestDto } from './dto/review-score-edit-request.dto';
import { ScoreEditRequestsRepository } from './score-edit-requests.repository';

// SPEC §2.5 POST /api/score-edit-requests. STAFF included since B4: a STAFF
// member who entered a score under their own identity may request its
// correction the same as a COMMITTEE member (ownership still enforced in
// CreateScoreEditRequestUseCase via Score.JudgeId, role-agnostic). TEAM_LEADER
// (mentor) may also request a correction for any score of their own school;
// the judge assigned to that problem then reviews it (PATCH below).
@Controller('score-edit-requests')
@UseGuards(AuthGuard, RolesGuard)
@Roles('COMMITTEE', 'STAFF', 'TEAM_LEADER')
export class ScoreEditRequestsController {
  constructor(
    private readonly createUseCase: CreateScoreEditRequestUseCase,
    private readonly reviewUseCase: ReviewScoreEditRequestUseCase,
    private readonly scoreEditRequestsRepository: ScoreEditRequestsRepository,
    private readonly userAssignmentRepository: UserAssignmentRepository,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateScoreEditRequestDto) {
    const request = await this.createUseCase.execute({
      scoreId: dto.scoreId,
      judgeId: user.id,
      requesterRole: user.role,
      requesterSchoolId: user.schoolId,
      newValue: dto.newValue,
      reason: dto.reason,
    });
    this.realtimeService.notifyChange();
    return { id: request.id };
  }

  /**
   * Requests visible to the caller — drives the red "edit requested" bar.
   * TEAM_LEADER: everything for their school. COMMITTEE/STAFF: their own
   * requests plus mentor-raised ones for a problem/school in their scope.
   */
  @Get()
  async list(@CurrentUser() user: User) {
    if (user.role === 'TEAM_LEADER') {
      return this.scoreEditRequestsRepository.findBySchoolWithContext(user.schoolId!);
    }
    const [all, scope] = await Promise.all([
      this.scoreEditRequestsRepository.findAllWithContext(),
      this.userAssignmentRepository.findScopeByUser(user.id),
    ]);
    return all.filter(
      (r) =>
        r.requestedBy === user.id ||
        (r.requestedByRole === 'TEAM_LEADER' &&
          scope.some(
            (s) =>
              s.problemNumber === r.problemNumber &&
              (s.schoolId === null || s.schoolId === r.schoolId),
          )),
    );
  }

  /** Judge reviews a mentor-raised request (team leaders use /team-leader/score-edit-requests). */
  @Patch(':id')
  @Roles('COMMITTEE', 'STAFF')
  async review(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReviewScoreEditRequestDto,
  ) {
    await this.reviewUseCase.execute({
      requestId: id,
      action: dto.action,
      reviewerId: user.id,
      reviewerRole: user.role,
    });
    this.realtimeService.notifyChange();
    return { ok: true };
  }
}
