import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SchoolsRepository } from '../schools/schools.repository';
import { ManageSchoolsUseCase } from './use-cases/manage-schools.use-case';
import { CreateSchoolDto, UpdateSchoolDto } from './dto/upsert-school.dto';

@Controller('admin/schools')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSchoolsController {
  constructor(
    private readonly manageSchools: ManageSchoolsUseCase,
    private readonly schoolsRepository: SchoolsRepository,
  ) {}

  @Get()
  list() {
    return this.schoolsRepository.findAll();
  }

  @Post()
  async create(@Body() dto: CreateSchoolDto) {
    const school = await this.manageSchools.create({ name: dto.name, code: dto.code ?? null });
    return { school };
  }

  @Patch()
  async update(@Body() dto: UpdateSchoolDto) {
    const school = await this.manageSchools.update(dto.id, { name: dto.name, code: dto.code ?? null });
    return { school };
  }

  @Delete()
  async remove(@Query('id') id: string) {
    await this.manageSchools.remove(id);
    return { ok: true };
  }
}
