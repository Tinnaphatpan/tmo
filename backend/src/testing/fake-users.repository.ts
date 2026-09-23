import { User } from '../domain/entities';
import { CreateUserInput, UsersRepository } from '../modules/users/users.repository';

export class FakeUsersRepository extends UsersRepository {
  private readonly users: User[] = [];

  seed(user: User): void {
    this.users.push(user);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.users.find((u) => u.username === username) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const user: User = {
      id: `user-${this.users.length + 1}`,
      username: input.username,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      role: input.role,
      schoolId: input.schoolId,
      signaturePath: null,
    };
    this.users.push(user);
    return user;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    const user = this.users.find((u) => u.id === id);
    if (user) user.passwordHash = passwordHash;
  }

  async delete(id: string): Promise<void> {
    const index = this.users.findIndex((u) => u.id === id);
    if (index >= 0) this.users.splice(index, 1);
  }

  async findAllCommittee(): Promise<User[]> {
    return this.users.filter((u) => u.role === 'COMMITTEE');
  }
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    username: 'user1',
    displayName: 'User One',
    passwordHash: 'hash',
    role: 'COMMITTEE',
    schoolId: null,
    signaturePath: null,
    ...overrides,
  };
}
