import { Body, Controller, Delete, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { QueueRepository } from '../queue/queue.repository';
import { ManageQueueUseCase } from './use-cases/manage-queue.use-case';
import { CreateQueueItemDto, MoveQueueItemDto } from './dto/manage-queue.dto';

// SPEC §2.5 — /api/admin/queue (ADMIN only).
@Controller('admin/queue')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminQueueController {
  constructor(
    private readonly manageQueue: ManageQueueUseCase,
    private readonly queueRepository: QueueRepository,
  ) {}

  @Get()
  list() {
    return this.queueRepository.findAllWithSchool();
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

  @Delete()
  async remove(@Query('id') id: string) {
    await this.manageQueue.remove(id);
    return { ok: true };
  }
}
