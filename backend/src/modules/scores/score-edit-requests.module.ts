import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ScoresDataModule } from './scores-data.module';
import { QueueModule } from '../queue/queue.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ApprovalModule } from '../approval/approval.module';
import { UserAssignmentModule } from '../user-assignment/user-assignment.module';
import { ScoreEditRequestsController } from './score-edit-requests.controller';
import { CreateScoreEditRequestUseCase } from './use-cases/create-score-edit-request.use-case';
import { ReviewScoreEditRequestUseCase } from './use-cases/review-score-edit-request.use-case';

@Module({
  imports: [
    AuthModule,
    ScoresDataModule,
    QueueModule,
    RealtimeModule,
    AuditLogModule,
    ApprovalModule,
    UserAssignmentModule,
  ],
  controllers: [ScoreEditRequestsController],
  providers: [CreateScoreEditRequestUseCase, ReviewScoreEditRequestUseCase],
})
export class ScoreEditRequestsModule {}
