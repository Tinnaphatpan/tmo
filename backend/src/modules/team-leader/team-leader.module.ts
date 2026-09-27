import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SchoolsModule } from '../schools/schools.module';
import { StudentsModule } from '../students/students.module';
import { ScoresDataModule } from '../scores/scores-data.module';
import { QueueModule } from '../queue/queue.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UserAssignmentModule } from '../user-assignment/user-assignment.module';
import { ApprovalModule } from '../approval/approval.module';
import { TeamLeaderReportController } from './team-leader-report.controller';
import { GetTeamLeaderReportUseCase } from './get-team-leader-report.use-case';
import { TeamLeaderScoreEditRequestsController } from './team-leader-score-edit-requests.controller';
import { ReviewScoreEditRequestUseCase } from '../scores/use-cases/review-score-edit-request.use-case';

@Module({
  imports: [
    AuthModule,
    SchoolsModule,
    StudentsModule,
    ScoresDataModule,
    QueueModule,
    RealtimeModule,
    AuditLogModule,
    ApprovalModule,
    UserAssignmentModule,
  ],
  controllers: [TeamLeaderReportController, TeamLeaderScoreEditRequestsController],
  providers: [GetTeamLeaderReportUseCase, ReviewScoreEditRequestUseCase],
})
export class TeamLeaderModule {}
