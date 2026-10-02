import { Body, Controller, Delete, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ManageStaffAssignmentsUseCase } from './use-cases/manage-staff.use-case';
import { ListStaffUseCase } from './use-cases/list-staff.use-case';
import { CreateStaffDto, UpdateStaffDto } from './dto/upsert-staff.dto';

@Controller('admin/staff')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminStaffController {
  constructor(
    private readonly manageStaff: ManageStaffAssignmentsUseCase,
    private readonly listStaff: ListStaffUseCase,
  ) {}

  @Get()
  list() {
    return this.listStaff.execute();
  }

  @Post()
  async create(@Body() dto: CreateStaffDto) {
    const user = await this.manageStaff.create(dto);
    return { user };
  }

  @Patch()
  async update(@Body() dto: UpdateStaffDto) {
    await this.manageStaff.update(dto.id, {
      assignments: dto.assignments,
      password: dto.password,
    });
    return { ok: true };
  }

  @Delete()
  async remove(@Query('id') id: string) {
    await this.manageStaff.remove(id);
    return { ok: true };
  }
}
