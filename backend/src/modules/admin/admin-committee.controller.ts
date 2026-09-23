import { Body, Controller, Delete, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ManageCommitteeUseCase } from './use-cases/manage-committee.use-case';
import { ListCommitteeUseCase } from './use-cases/list-committee.use-case';
import { CreateCommitteeDto, UpdateCommitteeDto } from './dto/upsert-committee.dto';

// SPEC §2.5 — /api/admin/committee (ADMIN only).
@Controller('admin/committee')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCommitteeController {
  constructor(
    private readonly manageCommittee: ManageCommitteeUseCase,
    private readonly listCommittee: ListCommitteeUseCase,
  ) {}

  @Get()
  list() {
    return this.listCommittee.execute();
  }

  @Post()
  async create(@Body() dto: CreateCommitteeDto) {
    const user = await this.manageCommittee.create(dto);
    return { user };
  }

  @Patch()
  async update(@Body() dto: UpdateCommitteeDto) {
    await this.manageCommittee.update(dto.id, {
      problemNumbers: dto.problemNumbers,
      password: dto.password,
    });
    return { ok: true };
  }

  @Delete()
  async remove(@Query('id') id: string) {
    await this.manageCommittee.remove(id);
    return { ok: true };
  }
}
