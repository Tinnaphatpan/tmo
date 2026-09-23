import { Global, Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { MssqlUsersRepository } from './users.repository.mssql';

@Global()
@Module({
  providers: [{ provide: UsersRepository, useClass: MssqlUsersRepository }],
  exports: [UsersRepository],
})
export class UsersModule {}
