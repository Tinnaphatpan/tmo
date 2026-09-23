import { Controller, Get, UseGuards } from '@nestjs/common';
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
  list() {
    return this.auditLogRepository.findAllWithContext();
  }
}
