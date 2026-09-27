import { Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DB_POOL } from '../../database/database.tokens';
import { Executor, request } from '../../database/types';
import { Student } from '../../domain/entities';
import { StudentsRepository, UpsertStudentInput } from './students.repository';

interface StudentRow {
  Id: string;
  StudentCode: string;
  SeqNo: number;
  Name: string;
  SchoolId: string;
}

function toEntity(row: StudentRow): Student {
  return {
    id: row.Id,
    studentCode: row.StudentCode,
    seqNo: row.SeqNo,
    name: row.Name,
    schoolId: row.SchoolId,
  };
}

@Injectable()
export class MssqlStudentsRepository extends StudentsRepository {
  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {
    super();
  }

  private exec(executor?: Executor): Executor {
    return executor ?? this.pool;
  }

  async findBySchool(schoolId: string, executor?: Executor): Promise<Student[]> {
    const result = await request(this.exec(executor))
      .input('schoolId', sql.UniqueIdentifier, schoolId)
      .query<StudentRow>(
        'SELECT Id, StudentCode, SeqNo, Name, SchoolId FROM Student WHERE SchoolId = @schoolId ORDER BY SeqNo',
      );
    return result.recordset.map(toEntity);
  }

  async findBySchools(schoolIds: string[], executor?: Executor): Promise<Student[]> {
    if (schoolIds.length === 0) return [];
    const req = request(this.exec(executor));
    const placeholders = schoolIds.map((id, i) => {
      req.input(`s${i}`, sql.UniqueIdentifier, id);
      return `@s${i}`;
    });
    const result = await req.query<StudentRow>(
      `SELECT Id, StudentCode, SeqNo, Name, SchoolId FROM Student WHERE SchoolId IN (${placeholders.join(',')}) ORDER BY SchoolId, SeqNo`,
    );
    return result.recordset.map(toEntity);
  }

  async findById(id: string, executor?: Executor): Promise<Student | null> {
    const result = await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query<StudentRow>('SELECT Id, StudentCode, SeqNo, Name, SchoolId FROM Student WHERE Id = @id');
    return result.recordset[0] ? toEntity(result.recordset[0]) : null;
  }

  async findByIds(ids: string[], executor?: Executor): Promise<Student[]> {
    if (ids.length === 0) return [];
    const req = request(this.exec(executor));
    const placeholders = ids.map((id, i) => {
      req.input(`id${i}`, sql.UniqueIdentifier, id);
      return `@id${i}`;
    });
    const result = await req.query<StudentRow>(
      `SELECT Id, StudentCode, SeqNo, Name, SchoolId FROM Student WHERE Id IN (${placeholders.join(',')})`,
    );
    return result.recordset.map(toEntity);
  }

  async upsert(input: UpsertStudentInput, executor?: Executor): Promise<Student> {
    const result = await request(this.exec(executor))
      .input('schoolId', sql.UniqueIdentifier, input.schoolId)
      .input('seqNo', sql.Int, input.seqNo)
      .input('name', sql.NVarChar, input.name)
      .input('studentCode', sql.NVarChar, input.studentCode)
      .query<StudentRow>(`
        MERGE Student AS target
        USING (SELECT @schoolId AS SchoolId, @seqNo AS SeqNo) AS src
          ON target.SchoolId = src.SchoolId AND target.SeqNo = src.SeqNo
        WHEN MATCHED THEN
          UPDATE SET Name = @name, StudentCode = @studentCode
        WHEN NOT MATCHED THEN
          INSERT (StudentCode, SeqNo, Name, SchoolId)
          VALUES (@studentCode, @seqNo, @name, @schoolId)
        OUTPUT INSERTED.Id, INSERTED.StudentCode, INSERTED.SeqNo, INSERTED.Name, INSERTED.SchoolId;
      `);
    return toEntity(result.recordset[0]);
  }

  async delete(id: string, executor?: Executor): Promise<void> {
    await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM Student WHERE Id = @id');
  }

  async countAll(executor?: Executor): Promise<number> {
    const result = await request(this.exec(executor)).query<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM Student',
    );
    return result.recordset[0].cnt;
  }
}
