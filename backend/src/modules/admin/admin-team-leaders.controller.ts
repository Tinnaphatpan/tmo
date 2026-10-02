import { Body, Controller, Delete, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ManageTeamLeaderUseCase } from './use-cases/manage-team-leader.use-case';
import { CreateTeamLeaderDto, UpdateTeamLeaderDto } from './dto/team-leader.dto';

@Controller('admin/team-leaders')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminTeamLeadersController {
  constructor(private readonly manageTeamLeader: ManageTeamLeaderUseCase) {}

  @Post()
  async create(@Body() dto: CreateTeamLeaderDto) {
    const user = await this.manageTeamLeader.create(dto);
    return { user };
  }

  @Patch()
  async update(@Body() dto: UpdateTeamLeaderDto) {
    await this.manageTeamLeader.update(dto.id, { schoolId: dto.schoolId, password: dto.password });
    return { ok: true };
  }

  @Delete()
  async remove(@Query('id') id: string) {
    await this.manageTeamLeader.remove(id);
    return { ok: true };
  }
}
