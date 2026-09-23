import { INestApplication, Provider, Type, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { User } from '../domain/entities';
import { UsersRepository } from '../modules/users/users.repository';
import { FakeUsersRepository, makeUser } from './fake-users.repository';

export interface ApiTestApp {
  app: INestApplication;
  usersRepo: FakeUsersRepository;
  /** Seeds `overrides` as a user and returns the `Authorization` header value for them. */
  login(overrides?: Partial<User>): string;
}

/**
 * HTTP-level test harness: the REAL AuthGuard/RolesGuard (JWT verify + DB
 * re-query + role check), ValidationPipe and HttpExceptionFilter as wired in
 * main.ts, in front of the given controllers — with fake repositories
 * standing in for the DB. Lets specs assert status codes and JSON bodies
 * exactly as a client sees them.
 */
export async function createApiTestApp(opts: {
  controllers: Type<unknown>[];
  providers: Provider[];
}): Promise<ApiTestApp> {
  const usersRepo = new FakeUsersRepository();
  const moduleRef = await Test.createTestingModule({
    imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
    controllers: opts.controllers,
    providers: [
      AuthGuard,
      RolesGuard,
      { provide: UsersRepository, useValue: usersRepo },
      ...opts.providers,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  const jwt = moduleRef.get(JwtService);
  let counter = 0;
  return {
    app,
    usersRepo,
    login(overrides = {}) {
      counter += 1;
      const user = makeUser({
        id: `api-user-${counter}`,
        username: `api-user-${counter}`,
        ...overrides,
      });
      usersRepo.seed(user);
      const token = jwt.sign({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        schoolId: user.schoolId,
      });
      return `Bearer ${token}`;
    },
  };
}
