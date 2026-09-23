import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  GetPermissionMatrixUseCase,
  PermissionMatrixRow,
} from './use-cases/get-permission-matrix.use-case';

@Controller('admin/permissions')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminPermissionsController {
  constructor(private readonly getPermissionMatrix: GetPermissionMatrixUseCase) {}

  @Get()
  list(): Promise<PermissionMatrixRow[]> {
    return this.getPermissionMatrix.execute();
  }
}
