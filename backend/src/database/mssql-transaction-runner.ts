import { Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DB_POOL } from './database.tokens';
import { TransactionRunner } from './transaction-runner';

@Injectable()
export class MssqlTransactionRunner extends TransactionRunner {
  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {
    super();
  }

  async run<T>(work: (tx: sql.Transaction) => Promise<T>): Promise<T> {
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin();
    try {
      const result = await work(transaction);
      await transaction.commit();
      return result;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}
