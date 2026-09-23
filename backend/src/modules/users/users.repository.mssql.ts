import { Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';
import { DB_POOL } from '../../database/database.tokens';
import { Executor, request } from '../../database/types';
import { User } from '../../domain/entities';
import { CreateUserInput, UsersRepository } from './users.repository';

interface UserRow {
  Id: string;
  Username: string;
  DisplayName: string;
  PasswordHash: string;
  Role: User['role'];
  SchoolId: string | null;
  SignaturePath: string | null;
}

const SELECT_COLUMNS = 'Id, Username, DisplayName, PasswordHash, Role, SchoolId, SignaturePath';

function toEntity(row: UserRow): User {
  return {
    id: row.Id,
    username: row.Username,
    displayName: row.DisplayName,
    passwordHash: row.PasswordHash,
    role: row.Role,
    schoolId: row.SchoolId,
    signaturePath: row.SignaturePath,
  };
}

@Injectable()
export class MssqlUsersRepository extends UsersRepository {
  constructor(@Inject(DB_POOL) private readonly pool: sql.ConnectionPool) {
    super();
  }

  private exec(executor?: Executor): Executor {
    return executor ?? this.pool;
  }

  async findByUsername(username: string, executor?: Executor): Promise<User | null> {
    const result = await request(this.exec(executor))
      .input('username', sql.NVarChar, username)
      .query<UserRow>(`SELECT ${SELECT_COLUMNS} FROM [User] WHERE Username = @username`);
    const row = result.recordset[0];
    return row ? toEntity(row) : null;
  }

  async findById(id: string, executor?: Executor): Promise<User | null> {
    const result = await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query<UserRow>(`SELECT ${SELECT_COLUMNS} FROM [User] WHERE Id = @id`);
    const row = result.recordset[0];
    return row ? toEntity(row) : null;
  }

  async create(input: CreateUserInput, executor?: Executor): Promise<User> {
    const result = await request(this.exec(executor))
      .input('username', sql.NVarChar, input.username)
      .input('displayName', sql.NVarChar, input.displayName)
      .input('passwordHash', sql.NVarChar, input.passwordHash)
      .input('role', sql.VarChar, input.role)
      .input('schoolId', sql.UniqueIdentifier, input.schoolId)
      .query<UserRow>(`
        INSERT INTO [User] (Username, DisplayName, PasswordHash, Role, SchoolId)
        OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.DisplayName, INSERTED.PasswordHash, INSERTED.Role, INSERTED.SchoolId, INSERTED.SignaturePath
        VALUES (@username, @displayName, @passwordHash, @role, @schoolId)
      `);
    return toEntity(result.recordset[0]);
  }

  async updatePasswordHash(id: string, passwordHash: string, executor?: Executor): Promise<void> {
    await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .query('UPDATE [User] SET PasswordHash = @passwordHash WHERE Id = @id');
  }

  async delete(id: string, executor?: Executor): Promise<void> {
    await request(this.exec(executor))
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM [User] WHERE Id = @id');
  }

  async findAllCommittee(executor?: Executor): Promise<User[]> {
    const result = await request(this.exec(executor)).query<UserRow>(
      `SELECT ${SELECT_COLUMNS} FROM [User] WHERE Role = 'COMMITTEE' ORDER BY Username`,
    );
    return result.recordset.map(toEntity);
  }
}
