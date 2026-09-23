import { Module } from '@nestjs/common';
import { UserAssignmentRepository } from './user-assignment.repository';
import { MssqlUserAssignmentRepository } from './user-assignment.repository.mssql';

@Module({
  providers: [{ provide: UserAssignmentRepository, useClass: MssqlUserAssignmentRepository }],
  exports: [UserAssignmentRepository],
})
export class UserAssignmentModule {}
