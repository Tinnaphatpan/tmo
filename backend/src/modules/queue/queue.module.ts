import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { UserAssignmentModule } from '../user-assignment/user-assignment.module';
import { StudentsModule } from '../students/students.module';
import { ScoresDataModule } from '../scores/scores-data.module';
import { SettingsModule } from '../settings/settings.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { QueueRepository } from './queue.repository';
import { MssqlQueueRepository } from './queue.repository.mssql';
import { QueueController } from './queue.controller';
import { GetPublicQueueUseCase } from './use-cases/get-public-queue.use-case';
import { GetMyQueueUseCase } from './use-cases/get-my-queue.use-case';
import { ClaimQueueItemUseCase } from './use-cases/claim-queue-item.use-case';
import { ReleaseQueueItemUseCase } from './use-cases/release-queue-item.use-case';
import { SkipQueueItemUseCase } from './use-cases/skip-queue-item.use-case';
import { SubmitScoreUseCase } from './use-cases/submit-score.use-case';

@Module({
  imports: [
    AuthModule,
    UserAssignmentModule,
    StudentsModule,
    ScoresDataModule,
    SettingsModule,
    AuditLogModule,
    RealtimeModule,
  ],
  controllers: [QueueController],
  providers: [
    { provide: QueueRepository, useClass: MssqlQueueRepository },
    GetPublicQueueUseCase,
    GetMyQueueUseCase,
    ClaimQueueItemUseCase,
    ReleaseQueueItemUseCase,
    SkipQueueItemUseCase,
    SubmitScoreUseCase,
  ],
  exports: [QueueRepository],
})
export class QueueModule {}
