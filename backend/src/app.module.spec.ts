import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { DB_POOL } from './database/database.tokens';

/**
 * Sanity check that every controller/use-case/repository provider in the
 * whole app resolves — no missing bindings, no circular deps — without a
 * real DB connection (this sandbox has no TCP-reachable MSSQL server; see
 * README). DB_POOL is swapped for a stub since nothing here executes a
 * query, only constructs the dependency graph.
 */
describe('AppModule wiring', () => {
  it('compiles the full DI graph', async () => {
    const fakePool = {
      request: () => ({ query: async () => ({ recordset: [] }) }),
      close: async () => undefined,
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DB_POOL)
      .useValue(fakePool)
      .compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});
