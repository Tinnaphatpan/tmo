import { Module } from '@nestjs/common';
import { StudentsRepository } from './students.repository';
import { MssqlStudentsRepository } from './students.repository.mssql';

@Module({
  providers: [{ provide: StudentsRepository, useClass: MssqlStudentsRepository }],
  exports: [StudentsRepository],
})
export class StudentsModule {}
