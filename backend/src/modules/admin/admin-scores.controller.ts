import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ScoresRepository } from '../scores/scores.repository';
import { toCsv } from '../../common/csv';

const EXPORT_HEADER = [
  'โรงเรียน',
  'รหัส',
  'รหัสนักเรียน',
  'ชื่อนักเรียน',
  'ข้อ',
  'คะแนน',
  'กรรมการ',
  'username',
  'เวลาบันทึก',
];

// SPEC §2.5 — /api/admin/scores (+ /export) (ADMIN only).
@Controller('admin/scores')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminScoresController {
  constructor(private readonly scoresRepository: ScoresRepository) {}

  @Get()
  list() {
    return this.scoresRepository.findExportRows();
  }

  @Get('export')
  async export(@Res() res: Response): Promise<void> {
    const rows = await this.scoresRepository.findExportRows();
    const csv = toCsv([
      EXPORT_HEADER,
      ...rows.map((r) => [
        r.schoolName,
        r.schoolCode ?? '',
        r.studentCode,
        r.studentName,
        r.problemNumber,
        r.value.toFixed(2),
        r.judgeDisplayName,
        r.judgeUsername,
        r.recordedAt.toISOString(),
      ]),
    ]);

    const filename = `tmo-scores-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
