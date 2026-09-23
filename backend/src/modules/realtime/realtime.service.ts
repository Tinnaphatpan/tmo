import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as sql from 'mssql';
import { Subject } from 'rxjs';
import { DB_POOL } from '../../database/database.tokens';

/**
 * SPEC §2.3 — realtime signal for the public board / committee page.
 * Two paths into `changes$`:
 *   1. Use cases call `notifyChange()` right after a write (ms latency).
 *   2. A 1s poll compares a cheap fingerprint of QueueItem/Score so writes
 *      from another process/instance, or direct DB edits, still surface.
 * The SSE controller turns `changes$` into the `changed` event; it never
 * carries a payload — clients refetch via REST, same as the old system.
 */
@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly changes$ = new Subject<void>();
  private lastFingerprint: string | null = null;
  private pollHandle?: NodeJS.Timeout;

  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {}

  onModuleInit(): void {
    this.pollHandle = setInterval(() => {
      void this.pollForExternalChanges();
    }, 1000);
  }

  onModuleDestroy(): void {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }

  notifyChange(): void {
    this.changes$.next();
  }

  get stream() {
    return this.changes$.asObservable();
  }

  private async pollForExternalChanges(): Promise<void> {
    try {
      const fingerprint = await this.computeFingerprint();
      if (this.lastFingerprint !== null && fingerprint !== this.lastFingerprint) {
        this.notifyChange();
      }
      this.lastFingerprint = fingerprint;
    } catch {
      // Transient DB hiccup — skip this tick, retry next interval.
    }
  }

  private async computeFingerprint(): Promise<string> {
    const result = await this.pool.request().query<{
      QueueCount: number;
      QueueChecksum: number | null;
      ScoreCount: number;
      ScoreChecksum: number | null;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM QueueItem) AS QueueCount,
        (SELECT CHECKSUM_AGG(BINARY_CHECKSUM(*)) FROM QueueItem) AS QueueChecksum,
        (SELECT COUNT(*) FROM Score) AS ScoreCount,
        (SELECT CHECKSUM_AGG(BINARY_CHECKSUM(*)) FROM Score) AS ScoreChecksum
    `);
    const row = result.recordset[0];
    return `${row.QueueCount}:${row.QueueChecksum}:${row.ScoreCount}:${row.ScoreChecksum}`;
  }
}
