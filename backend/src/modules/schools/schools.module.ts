import { Module } from '@nestjs/common';
import { SchoolsRepository } from './schools.repository';
import { MssqlSchoolsRepository } from './schools.repository.mssql';

@Module({
  providers: [{ provide: SchoolsRepository, useClass: MssqlSchoolsRepository }],
  exports: [SchoolsRepository],
})
export class SchoolsModule {}
