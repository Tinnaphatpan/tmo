import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { SchoolsModule } from '../schools/schools.module';
import { StudentsModule } from '../students/students.module';
import { ScoresDataModule } from '../scores/scores-data.module';
import { ApprovalController } from './approval.controller';
import { ApproveScoreSetUseCase } from './use-cases/approve-score-set.use-case';
import { ScoreSheetGenerator } from './score-sheet-generator';

@Module({
  imports: [AuthModule, QueueModule, SchoolsModule, StudentsModule, ScoresDataModule],
  controllers: [ApprovalController],
  providers: [ApproveScoreSetUseCase, ScoreSheetGenerator],
  exports: [ScoreSheetGenerator],
})
export class ApprovalModule {}
