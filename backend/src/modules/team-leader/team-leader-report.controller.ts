import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../domain/entities';
import { GetTeamLeaderReportUseCase } from './get-team-leader-report.use-case';
import { buildTeamLeaderReportWorkbook } from './team-leader-export.builder';
import { contentDispositionFilename } from '../../common/csv';

// SPEC §2.5 GET /api/team-leader/export (+ §5.3 /team-leader page data) — TEAM_LEADER only.
// `user.schoolId` comes from the JWT-verified, DB-reloaded User (AuthGuard) —
// never from a client-supplied parameter (SPEC §4.4's explicit IDOR warning).
@Controller('team-leader')
@UseGuards(AuthGuard, RolesGuard)
@Roles('TEAM_LEADER')
export class TeamLeaderReportController {
  constructor(private readonly getTeamLeaderReport: GetTeamLeaderReportUseCase) {}

  @Get('report')
  report(@CurrentUser() user: User) {
    return this.getTeamLeaderReport.execute(user.schoolId!);
  }

  @Get('export')
  async export(@CurrentUser() user: User, @Res() res: Response): Promise<void> {
    const report = await this.getTeamLeaderReport.execute(user.schoolId!);
    const buffer = await buildTeamLeaderReportWorkbook(report);

    const filename = `tmo-team-leader-${report.schoolName || 'report'}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', contentDispositionFilename(filename));
    res.send(Buffer.from(buffer));
  }
}
