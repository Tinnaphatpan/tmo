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
import { CreateQueueItemDto, GenerateScheduleDto, MoveQueueItemDto, SetQueueTimeDto } from './dto/manage-queue.dto';

// SPEC §2.5 — /api/admin/queue (ADMIN only).
@Controller('admin/queue')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminQueueController {
  constructor(
    private readonly manageQueue: ManageQueueUseCase,
    private readonly queueRepository: QueueRepository,
    private readonly generateSchedule: GenerateQueueScheduleUseCase,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Get()
  list() {
    return this.queueRepository.findAllWithSchool();
  }

  /** Builds the full rotation queue (16 centres x 5 problems with 15-minute slots from 13:30). */
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

  @Patch(':id/time')
  async setTime(@Param('id') id: string, @Body() dto: SetQueueTimeDto) {
    await this.manageQueue.setScheduledTime(id, dto.date, dto.time);
    this.realtimeService.notifyChange();
    return { ok: true };
  }

  @Delete()
  async remove(@Query('id') id: string) {
    await this.manageQueue.remove(id);
    return { ok: true };
  }
}
