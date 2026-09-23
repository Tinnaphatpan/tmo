import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';
import { AppConfig } from '../config/configuration';
import { DB_POOL } from './database.tokens';
import { TransactionRunner } from './transaction-runner';
import { MssqlTransactionRunner } from './mssql-transaction-runner';

@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      inject: [ConfigService],
      useFactory: async (config: ConfigService<AppConfig, true>) => {
        const db = config.get('db', { infer: true });
        const pool = new sql.ConnectionPool({
          server: db.server,
          port: db.port,
          database: db.database,
          user: db.user,
          password: db.password,
          options: {
            encrypt: db.encrypt,
            trustServerCertificate: db.trustServerCertificate,
          },
          pool: {
            min: db.poolMin,
            max: db.poolMax,
          },
        });
        await pool.connect();
        return pool;
      },
    },
    { provide: TransactionRunner, useClass: MssqlTransactionRunner },
  ],
  exports: [DB_POOL, TransactionRunner],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {}

  async onModuleDestroy() {
    await this.pool.close();
  }
}
