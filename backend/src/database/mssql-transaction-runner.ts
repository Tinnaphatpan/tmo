import { Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DB_POOL } from './database.tokens';
import { TransactionRunner } from './transaction-runner';

const DEADLOCK_ERROR_NUMBER = 1205;
const MAX_ATTEMPTS = 4;

function isDeadlock(err: unknown): boolean {
  const e = err as { number?: number; originalError?: { number?: number; info?: { number?: number } } };
  return [e?.number, e?.originalError?.number, e?.originalError?.info?.number].includes(
    DEADLOCK_ERROR_NUMBER,
  );
}

@Injectable()
export class MssqlTransactionRunner extends TransactionRunner {
  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {
    super();
  }

  /**
   * Runs `work` in one transaction. When SQL Server picks this transaction as a
   * deadlock victim (error 1205 — e.g. concurrent MERGE upserts into Score
   * from different judges) it has already rolled everything back, so the whole
   * unit is simply run again in a fresh transaction, with a little jitter.
   */
  async run<T>(work: (tx: sql.Transaction) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.runOnce(work);
      } catch (err) {
        if (!isDeadlock(err) || attempt >= MAX_ATTEMPTS) throw err;
        await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 80 * attempt));
      }
    }
  }

  private async runOnce<T>(work: (tx: sql.Transaction) => Promise<T>): Promise<T> {
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin();
    try {
      const result = await work(transaction);
      await transaction.commit();
      return result;
    } catch (err) {
      // SQL Server may already have aborted the transaction itself (deadlock
      // victim, timeout); rollback() then throws EABORT and would mask `err`.
      await transaction.rollback().catch(() => undefined);
      throw err;
    }
  }
}
