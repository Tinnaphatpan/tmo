import { Injectable } from '@nestjs/common';
import { UserAssignmentRepository } from '../../user-assignment/user-assignment.repository';
import { UsersRepository } from '../../users/users.repository';

export interface CommitteeListItem {
  id: string;
  username: string;
  displayName: string;
  problemNumbers: number[];
}

@Injectable()
export class ListCommitteeUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userAssignmentRepository: UserAssignmentRepository,
  ) {}

  async execute(): Promise<CommitteeListItem[]> {
    const users = await this.usersRepository.findAllCommittee();
    return Promise.all(
      users.map(async (u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        problemNumbers: await this.userAssignmentRepository.findProblemNumbersByUser(u.id),
      })),
    );
  }
}
