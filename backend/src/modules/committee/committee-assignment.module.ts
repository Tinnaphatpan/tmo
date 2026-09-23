import { Module } from '@nestjs/common';
import { CommitteeAssignmentRepository } from './committee-assignment.repository';
import { MssqlCommitteeAssignmentRepository } from './committee-assignment.repository.mssql';

@Module({
  providers: [
    { provide: CommitteeAssignmentRepository, useClass: MssqlCommitteeAssignmentRepository },
  ],
  exports: [CommitteeAssignmentRepository],
})
export class CommitteeAssignmentModule {}
