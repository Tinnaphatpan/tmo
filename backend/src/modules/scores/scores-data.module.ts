import { Module } from '@nestjs/common';
import { ScoresRepository } from './scores.repository';
import { MssqlScoresRepository } from './scores.repository.mssql';
import { ScoreEditRequestsRepository } from './score-edit-requests.repository';
import { MssqlScoreEditRequestsRepository } from './score-edit-requests.repository.mssql';

/**
 * Repository-only module (no controllers) so QueueModule and the future
 * ScoreEditRequests/Admin controllers can both depend on these without a
 * circular import between feature modules.
 */
@Module({
  providers: [
    { provide: ScoresRepository, useClass: MssqlScoresRepository },
    { provide: ScoreEditRequestsRepository, useClass: MssqlScoreEditRequestsRepository },
  ],
  exports: [ScoresRepository, ScoreEditRequestsRepository],
})
export class ScoresDataModule {}
