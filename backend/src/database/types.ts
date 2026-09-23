import * as sql from 'mssql';

/**
 * Anything a repository can run a `Request` against: either the shared pool
 * (plain reads, or writes that don't need to share a transaction with
 * anything else) or a `Transaction` handed out by TransactionRunner (SPEC
 * §1.4 — Score writes + AuditLog writes must always share one).
 */
export type Executor = sql.ConnectionPool | sql.Transaction;

export function request(executor: Executor): sql.Request {
  if (executor instanceof sql.Transaction) {
    return new sql.Request(executor);
  }
  return new sql.Request(executor);
}
