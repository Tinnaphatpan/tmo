import type { Transaction } from 'mssql';
import { AuditLogEntry } from '../domain/entities';
import { AuditLogRepository, CreateAuditLogInput } from '../modules/audit-log/audit-log.repository';

export class FakeAuditLogRepository extends AuditLogRepository {
  readonly entries: AuditLogEntry[] = [];

  async create(input: CreateAuditLogInput, _tx: Transaction): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: `audit-${this.entries.length + 1}`,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: input.oldValue,
      newValue: input.newValue,
      performedBy: input.performedBy,
      createdAt: new Date(),
    };
    this.entries.push(entry);
    return entry;
  }

  async findAll(): Promise<AuditLogEntry[]> {
    return this.entries;
  }

  async findAllWithContext(): Promise<Array<AuditLogEntry & { performedByDisplayName: string }>> {
    return this.entries.map((e) => ({ ...e, performedByDisplayName: 'x' }));
  }
}
