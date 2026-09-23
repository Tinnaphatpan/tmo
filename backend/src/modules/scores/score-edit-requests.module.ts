import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ScoresDataModule } from './scores-data.module';
import { ScoreEditRequestsController } from './score-edit-requests.controller';
import { CreateScoreEditRequestUseCase } from './use-cases/create-score-edit-request.use-case';

@Module({
  imports: [AuthModule, ScoresDataModule],
  controllers: [ScoreEditRequestsController],
  providers: [CreateScoreEditRequestUseCase],
})
export class ScoreEditRequestsModule {}
