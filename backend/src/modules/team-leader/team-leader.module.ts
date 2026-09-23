import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SchoolsModule } from '../schools/schools.module';
import { StudentsModule } from '../students/students.module';
import { ScoresDataModule } from '../scores/scores-data.module';
import { TeamLeaderReportController } from './team-leader-report.controller';
import { GetTeamLeaderReportUseCase } from './get-team-leader-report.use-case';

@Module({
  imports: [AuthModule, SchoolsModule, StudentsModule, ScoresDataModule],
  controllers: [TeamLeaderReportController],
  providers: [GetTeamLeaderReportUseCase],
})
export class TeamLeaderModule {}
