import * as sql from 'mssql';
import { AuditLogEntry } from '../../domain/entities';
import { Executor } from '../../database/types';

export interface CreateAuditLogInput {
  action: string;
  entityType: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  performedBy: string;
}

export interface AuditLogContext {
  performedByDisplayName: string;
  /** Score entries: the student / school / problem the score belongs to. */
  studentName: string | null;
  schoolName: string | null;
  problemNumber: number | null;
  /** User entries (e.g. USER_ROLE_CHANGED): the account that was changed. */
  targetUserName: string | null;
}

export interface AuditLogPageQuery {
  limit: number;
  offset: number;
  action?: string;
  /** Case-insensitive match on performer, student, school or target user name. */
  search?: string;
}

export abstract class AuditLogRepository {
  /**
   * `tx` is typed as `sql.Transaction`, not the general `Executor` — on
   * purpose. SPEC §1.4 requires every Score mutation to carry an AuditLog
   * write in the *same* transaction; typing this parameter narrowly means
   * "just call create() on the pool" doesn't even compile, so the only way
   * to write an audit entry is inside a TransactionRunner.run() block.
   */
  abstract create(input: CreateAuditLogInput, tx: sql.Transaction): Promise<AuditLogEntry>;
  abstract findAll(executor?: Executor): Promise<AuditLogEntry[]>;
  abstract findAllWithContext(
    executor?: Executor,
  ): Promise<Array<AuditLogEntry & { performedByDisplayName: string }>>;
  abstract findPage(
    query: AuditLogPageQuery,
    executor?: Executor,
  ): Promise<{ items: Array<AuditLogEntry & AuditLogContext>; total: number }>;
}
