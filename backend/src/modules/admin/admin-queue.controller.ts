import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../domain/entities';
import { RealtimeService } from '../realtime/realtime.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { QueueRepository } from '../queue/queue.repository';
import { ManageQueueUseCase } from './use-cases/manage-queue.use-case';
import { GenerateQueueScheduleUseCase } from './use-cases/generate-queue-schedule.use-case';
import { ResetQueueUseCase } from './use-cases/reset-queue.use-case';
import { CreateQueueItemDto, GenerateScheduleDto, MoveQueueItemDto, UpdateQueueItemDto } from './dto/manage-queue.dto';

@Controller('admin/queue')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminQueueController {
  constructor(
    private readonly manageQueue: ManageQueueUseCase,
    private readonly queueRepository: QueueRepository,
    private readonly generateSchedule: GenerateQueueScheduleUseCase,
    private readonly resetQueue: ResetQueueUseCase,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Get()
  list() {
    return this.queueRepository.findAllWithSchool();
  }

  @Post('generate')
  async generate(@CurrentUser() user: User, @Body() dto: GenerateScheduleDto) {
    const result = await this.generateSchedule.execute({
      date: dto.date,
      startTime: dto.startTime,
      slotMinutes: dto.slotMinutes,
      actorId: user.id,
    });
    this.realtimeService.notifyChange();
    return result;
  }

  @Post()
  async create(@Body() dto: CreateQueueItemDto) {
    const item = await this.manageQueue.create(dto.schoolId, dto.problemNumber);
    return { item };
  }

  @Patch()
  async move(@Body() dto: MoveQueueItemDto) {
    await this.manageQueue.move(dto.id, dto.direction);
    return { ok: true };
  }

  /** Full edit — school, problem and time together (SPEC-adjacent extension past the original time-only edit). */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateQueueItemDto) {
    const item = await this.manageQueue.update(id, dto);
    this.realtimeService.notifyChange();
    return { item };
  }

  @Delete()
  async remove(@Query('id') id: string) {
    await this.manageQueue.remove(id);
    return { ok: true };
  }

  /** UI-reachable equivalent of `npm run reset:test -- --yes` — see ResetQueueUseCase. */
  @Post('reset')
  async reset(@CurrentUser() user: User) {
    const result = await this.resetQueue.execute(user.id);
    this.realtimeService.notifyChange();
    return result;
  }
}
