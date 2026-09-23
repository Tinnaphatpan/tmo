import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetDashboardUseCase } from './use-cases/get-dashboard.use-case';

@Controller('admin/dashboard')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminDashboardController {
  constructor(private readonly getDashboard: GetDashboardUseCase) {}

  @Get()
  get() {
    return this.getDashboard.execute();
  }
}
