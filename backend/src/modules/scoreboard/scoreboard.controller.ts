import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetScoreboardUseCase, ScoreboardRow } from './get-scoreboard.use-case';

// Read-only overview for the examiner roles (F5) — no per-user scoping.
@Controller('scoreboard')
@UseGuards(AuthGuard, RolesGuard)
@Roles('COMMITTEE', 'STAFF')
export class ScoreboardController {
  constructor(private readonly getScoreboard: GetScoreboardUseCase) {}

  @Get()
  list(): Promise<ScoreboardRow[]> {
    return this.getScoreboard.execute();
  }
}
