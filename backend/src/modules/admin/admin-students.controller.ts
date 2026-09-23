import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StudentsRepository } from '../students/students.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { StudentImportUseCase } from './student-import/student-import.use-case';

// SPEC §2.5 / §4.1 — /api/admin/students (+ /import) (ADMIN only).
@Controller('admin/students')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminStudentsController {
  constructor(
    private readonly importUseCase: StudentImportUseCase,
    private readonly studentsRepository: StudentsRepository,
    private readonly schoolsRepository: SchoolsRepository,
  ) {}

  @Get()
  async list() {
    const schools = await this.schoolsRepository.findAll();
    const bySchool = await Promise.all(
      schools.map((s) => this.studentsRepository.findBySchool(s.id)),
    );
    return bySchool.flat();
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('mode') mode: string,
  ) {
    if (!file) {
      throw new BadRequestException('กรุณาแนบไฟล์');
    }
    if (mode === 'commit') {
      return this.importUseCase.commit(file.buffer, file.originalname);
    }
    return this.importUseCase.preview(file.buffer, file.originalname);
  }

  @Delete()
  async remove(@Query('id') id: string) {
    await this.studentsRepository.delete(id);
    return { ok: true };
  }
}
