import type { Transaction } from 'mssql';
import { TransactionRunner } from '../database/transaction-runner';

/** Runs the callback in-process with no real transaction — fakes below ignore the tx arg anyway. */
export class FakeTransactionRunner extends TransactionRunner {
  async run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    return work(undefined as unknown as Transaction);
  }
}
