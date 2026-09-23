import { Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DB_POOL } from '../../database/database.tokens';
import { Executor, request } from '../../database/types';
import { School } from '../../domain/entities';
import { SchoolsRepository, UpsertSchoolInput } from './schools.repository';

interface SchoolRow {
  Id: string;
  Name: string;
  Code: string | null;
}

function toEntity(row: SchoolRow): School {
  return { id: row.Id, name: row.Name, code: row.Code };
}

@Injectable()
export class MssqlSchoolsRepository extends SchoolsRepository {
  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {
    super();
  }

  private exec(executor?: Executor): Executor {
    return executor ?? this.pool;
  }

  async findAll(executor?: Executor): Promise<School[]> {
    const result = await request(this.exec(executor)).query<SchoolRow>(
      'SELECT Id, Name, Code FROM School ORDER BY Name',
    );
    return result.recordset.map(toEntity);
  }

  async findById(id: string, executor?: Executor): Promise<School | null> {
    const result = await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query<SchoolRow>('SELECT Id, Name, Code FROM School WHERE Id = @id');
    return result.recordset[0] ? toEntity(result.recordset[0]) : null;
  }

  async findByCode(code: string, executor?: Executor): Promise<School | null> {
    const result = await request(this.exec(executor))
      .input('code', sql.NVarChar, code)
      .query<SchoolRow>('SELECT Id, Name, Code FROM School WHERE LOWER(Code) = LOWER(@code)');
    return result.recordset[0] ? toEntity(result.recordset[0]) : null;
  }

  async create(input: UpsertSchoolInput, executor?: Executor): Promise<School> {
    const result = await request(this.exec(executor))
      .input('name', sql.NVarChar, input.name)
      .input('code', sql.NVarChar, input.code)
      .query<SchoolRow>(`
        INSERT INTO School (Name, Code)
        OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Code
        VALUES (@name, @code)
      `);
    return toEntity(result.recordset[0]);
  }

  async update(id: string, input: UpsertSchoolInput, executor?: Executor): Promise<School> {
    const result = await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.NVarChar, input.name)
      .input('code', sql.NVarChar, input.code)
      .query<SchoolRow>(`
        UPDATE School SET Name = @name, Code = @code
        OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Code
        WHERE Id = @id
      `);
    return toEntity(result.recordset[0]);
  }

  async delete(id: string, executor?: Executor): Promise<void> {
    await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM School WHERE Id = @id');
  }

  async hasQueueItems(id: string, executor?: Executor): Promise<boolean> {
    const result = await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query<{ cnt: number }>(
        'SELECT COUNT(*) AS cnt FROM QueueItem WHERE SchoolId = @id',
      );
    return result.recordset[0].cnt > 0;
  }
}
