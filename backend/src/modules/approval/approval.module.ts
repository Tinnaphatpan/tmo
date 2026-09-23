import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { ApprovalController } from './approval.controller';
import { ApproveScoreSetUseCase } from './use-cases/approve-score-set.use-case';

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [ApprovalController],
  providers: [ApproveScoreSetUseCase],
})
export class ApprovalModule {}
