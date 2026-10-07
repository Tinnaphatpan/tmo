import type { Transaction } from 'mssql';
import { AuditLogEntry } from '../domain/entities';
import {
  AuditLogContext,
  AuditLogPageQuery,
  AuditLogRepository,
  CreateAuditLogInput,
} from '../modules/audit-log/audit-log.repository';

export class FakeAuditLogRepository extends AuditLogRepository {
  readonly entries: AuditLogEntry[] = [];

  async create(input: CreateAuditLogInput, _tx: Transaction): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: `audit-${this.entries.length + 1}`,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      changes: input.changes,
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

  async findPage(
    query: AuditLogPageQuery,
  ): Promise<{ items: Array<AuditLogEntry & AuditLogContext>; total: number }> {
    const matched = this.entries
      .filter((e) => !query.action || e.action === query.action)
      .map((e) => ({
        ...e,
        performedByDisplayName: 'x',
        studentName: null,
        schoolName: null,
        problemNumber: null,
        targetUserName: null,
      }))
      .filter((e) => !query.search || e.performedByDisplayName.includes(query.search));
    return { total: matched.length, items: matched.slice(query.offset, query.offset + query.limit) };
  }
}
