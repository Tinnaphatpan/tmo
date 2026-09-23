import type { Transaction } from 'mssql';

/**
 * SPEC §1.4: the one sanctioned way to open a transaction anywhere in this
 * codebase — Score writes and their AuditLog entry must always share one.
 * The callback receives a concrete `mssql` `Transaction` (not the wider
 * `Executor` union) so that `AuditLogRepository.create`, which is typed to
 * only accept a `Transaction`, can be called directly with it — no cast,
 * and no way to accidentally call it against the plain pool.
 *
 * Declared as an abstraction (not the mssql-backed class) so Use Cases can
 * be unit-tested with a fake that just invokes the callback in-process; the
 * `mssql` import above is type-only and carries no runtime dependency.
 */
export abstract class TransactionRunner {
  abstract run<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
}
