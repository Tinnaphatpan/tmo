import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SchoolsModule } from '../schools/schools.module';
import { ScoresDataModule } from '../scores/scores-data.module';
import { ScoreboardController } from './scoreboard.controller';
import { GetScoreboardUseCase } from './get-scoreboard.use-case';

@Module({
  imports: [AuthModule, SchoolsModule, ScoresDataModule],
  controllers: [ScoreboardController],
  providers: [GetScoreboardUseCase],
})
export class ScoreboardModule {}
