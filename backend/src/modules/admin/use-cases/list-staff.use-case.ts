import { Injectable } from '@nestjs/common';
import { UserAssignmentRepository, UserAssignmentScope } from '../../user-assignment/user-assignment.repository';
import { UsersRepository } from '../../users/users.repository';

export interface StaffListItem {
  id: string;
  username: string;
  displayName: string;
  assignments: UserAssignmentScope[];
}

@Injectable()
export class ListStaffUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userAssignmentRepository: UserAssignmentRepository,
  ) {}

  async execute(): Promise<StaffListItem[]> {
    const users = await this.usersRepository.findAllByRole('STAFF');
    return Promise.all(
      users.map(async (u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        assignments: await this.userAssignmentRepository.findScopeByUser(u.id),
      })),
    );
  }
}
