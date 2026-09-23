import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../domain/entities';
import { GetMentorReportUseCase } from './get-mentor-report.use-case';
import { buildMentorReportWorkbook } from './mentor-export.builder';
import { contentDispositionFilename } from '../../common/csv';

// SPEC §2.5 GET /api/mentor/export (+ §5.3 /mentor page data) — MENTOR only.
// `user.schoolId` comes from the JWT-verified, DB-reloaded User (AuthGuard) —
// never from a client-supplied parameter (SPEC §4.4's explicit IDOR warning).
@Controller('mentor')
@UseGuards(AuthGuard, RolesGuard)
@Roles('MENTOR')
export class MentorController {
  constructor(private readonly getMentorReport: GetMentorReportUseCase) {}

  @Get('report')
  report(@CurrentUser() user: User) {
    return this.getMentorReport.execute(user.schoolId!);
  }

  @Get('export')
  async export(@CurrentUser() user: User, @Res() res: Response): Promise<void> {
    const report = await this.getMentorReport.execute(user.schoolId!);
    const buffer = await buildMentorReportWorkbook(report);

    const filename = `tmo-mentor-${report.schoolName || 'report'}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', contentDispositionFilename(filename));
    res.send(Buffer.from(buffer));
  }
}
