import { Module } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';
import { MssqlAuditLogRepository } from './audit-log.repository.mssql';

@Module({
  providers: [{ provide: AuditLogRepository, useClass: MssqlAuditLogRepository }],
  exports: [AuditLogRepository],
})
export class AuditLogModule {}
