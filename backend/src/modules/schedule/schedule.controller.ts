import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { GetScheduleExportUseCase } from './get-schedule-export.use-case';

// SPEC §2.5 — public, no auth (no scores involved).
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly getScheduleExport: GetScheduleExportUseCase) {}

  @Get('export')
  async export(@Res() res: Response): Promise<void> {
    const csv = await this.getScheduleExport.execute();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="tmo-verification-schedule.csv"',
    );
    res.send(csv);
  }
}
