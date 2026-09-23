import { User, Role } from '../../domain/entities';
import { Executor } from '../../database/types';

export interface CreateUserInput {
  username: string;
  displayName: string;
  passwordHash: string;
  role: Role;
  schoolId: string | null;
}

/**
 * Contract only — no mssql import here. Concrete queries live in
 * MssqlUsersRepository (Clean Architecture: use-cases depend on this
 * abstraction, never on the driver).
 */
export abstract class UsersRepository {
  abstract findByUsername(username: string, executor?: Executor): Promise<User | null>;
  abstract findById(id: string, executor?: Executor): Promise<User | null>;
  abstract create(input: CreateUserInput, executor?: Executor): Promise<User>;
  abstract updatePasswordHash(id: string, passwordHash: string, executor?: Executor): Promise<void>;
  abstract updateSignaturePath(id: string, signaturePath: string, executor?: Executor): Promise<void>;
  abstract delete(id: string, executor?: Executor): Promise<void>;
  abstract findAllCommittee(executor?: Executor): Promise<User[]>;
}
