import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLogRepository } from '../audit-log/audit-log.repository';

// SPEC §5.4 "/admin/audit-log — ดูประวัติการแก้ไขทั้งหมด" — endpoint not
// itemized in §2.5's table but required for that page to have data.
@Controller('admin/audit-log')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminAuditLogController {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  @Get()
  list(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('action') action?: string,
    @Query('q') q?: string,
  ) {
    const toInt = (v: string | undefined, fallback: number) => {
      const n = Number.parseInt(v ?? '', 10);
      return Number.isFinite(n) && n >= 0 ? n : fallback;
    };
    return this.auditLogRepository.findPage({
      limit: Math.min(Math.max(toInt(limit, 50), 1), 200),
      offset: toInt(offset, 0),
      action: action || undefined,
      search: q || undefined,
    });
  }
}
