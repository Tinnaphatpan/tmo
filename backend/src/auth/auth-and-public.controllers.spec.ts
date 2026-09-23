import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ApiTestApp, createApiTestApp } from '../testing/api-test-app';
import { makeUser } from '../testing/fake-users.repository';
import { FakeSchoolsRepository } from '../testing/fake-schools.repository';
import { SchoolsRepository } from '../modules/schools/schools.repository';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ScheduleController } from '../modules/schedule/schedule.controller';
import { GetScheduleExportUseCase } from '../modules/schedule/get-schedule-export.use-case';
import { ScoreboardController } from '../modules/scoreboard/scoreboard.controller';
import { GetScoreboardUseCase } from '../modules/scoreboard/get-scoreboard.use-case';
import { ScoresRepository } from '../modules/scores/scores.repository';
import { FakeScoresRepository } from '../testing/fake-scores.repository';

describe('GET /health and POST /auth/login and AuthGuard (HTTP)', () => {
  let api: ApiTestApp;

  beforeEach(async () => {
    const schools = new FakeSchoolsRepository();
    for (let i = 1; i <= 3; i++) schools.seed({ id: `s${i}`, name: `School ${i}`, code: `C${i}` });
    api = await createApiTestApp({
      controllers: [AppController, AuthController, ScheduleController, ScoreboardController],
      providers: [
        AppService,
        AuthService,
        GetScheduleExportUseCase,
        GetScoreboardUseCase,
        { provide: SchoolsRepository, useValue: schools },
        { provide: ScoresRepository, useValue: new FakeScoresRepository() },
      ],
    });
    api.usersRepo.seed(
      makeUser({
        id: 'u1',
        username: 'alice',
        displayName: 'Alice',
        role: 'STAFF',
        schoolId: null,
        passwordHash: await bcrypt.hash('correct-horse', 4),
      }),
    );
  });

  afterEach(() => api.app.close());

  const http = () => request(api.app.getHttpServer());

  describe('GET /health', () => {
    it('200 { status: ok } with no auth', async () => {
      await http().get('/health').expect(200).expect({ status: 'ok' });
    });
  });

  describe('POST /auth/login', () => {
    it('200 with a verifiable JWT and the user payload (no password hash)', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ username: 'alice', password: 'correct-horse' })
        .expect(200);

      expect(res.body.user).toEqual({
        id: 'u1',
        username: 'alice',
        displayName: 'Alice',
        role: 'STAFF',
        schoolId: null,
      });
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
      const decoded = api.app.get(JwtService).verify(res.body.token);
      expect(decoded).toMatchObject({ id: 'u1', role: 'STAFF' });
    });

    it('401 with the same message for a wrong password and an unknown user (no user enumeration)', async () => {
      const wrong = await http().post('/auth/login').send({ username: 'alice', password: 'nope' }).expect(401);
      const unknown = await http().post('/auth/login').send({ username: 'ghost', password: 'x' }).expect(401);
      expect(wrong.body.error).toBeTruthy();
      expect(wrong.body.error).toBe(unknown.body.error);
    });

    it('400 for missing/empty fields and for unknown extra fields', async () => {
      await http().post('/auth/login').send({}).expect(400);
      await http().post('/auth/login').send({ username: 'alice' }).expect(400);
      await http().post('/auth/login').send({ username: '', password: '' }).expect(400);
      await http().post('/auth/login').send({ username: 'alice', password: 'x', role: 'ADMIN' }).expect(400);
    });

    it('the issued token works against a guarded endpoint', async () => {
      const { body } = await http().post('/auth/login').send({ username: 'alice', password: 'correct-horse' });
      await http().get('/scoreboard').set('Authorization', `Bearer ${body.token}`).expect(200);
    });
  });

  describe('AuthGuard (applies to every guarded route)', () => {
    it('401 for: no header, wrong scheme, garbage token, token signed with another secret', async () => {
      await http().get('/scoreboard').expect(401);
      await http().get('/scoreboard').set('Authorization', 'Basic abc').expect(401);
      await http().get('/scoreboard').set('Authorization', 'Bearer garbage').expect(401);
      const forged = new JwtService({ secret: 'other-secret' }).sign({ id: 'u1', role: 'ADMIN' });
      await http().get('/scoreboard').set('Authorization', `Bearer ${forged}`).expect(401);
    });

    it('401 for an expired token', async () => {
      const expired = api.app.get(JwtService).sign({ id: 'u1', role: 'STAFF' }, { expiresIn: '-10s' });
      await http().get('/scoreboard').set('Authorization', `Bearer ${expired}`).expect(401);
    });

    it('401 when the user was deleted after the token was issued (DB re-check, SPEC §2.2)', async () => {
      const auth = api.login({ id: 'temp', role: 'COMMITTEE' });
      await http().get('/scoreboard').set('Authorization', auth).expect(200);
      await api.usersRepo.delete('temp');
      await http().get('/scoreboard').set('Authorization', auth).expect(401);
    });

    it('uses the role currently in the DB, not the (stale) role inside the JWT', async () => {
      const auth = api.login({ id: 'demoted', role: 'COMMITTEE' }); // token says COMMITTEE
      const user = (await api.usersRepo.findById('demoted'))!;
      user.role = 'TEAM_LEADER'; // role changed after issuing
      await http().get('/scoreboard').set('Authorization', auth).expect(403);
    });
  });

  describe('GET /auth/me', () => {
    it('401 without a token', async () => {
      await http().get('/auth/me').expect(401);
    });

    it('returns the caller as the DB sees them now (fresh role after a role change), never the hash', async () => {
      const auth = api.login({ id: 'me-1', role: 'COMMITTEE', displayName: 'Me' });
      const before = await http().get('/auth/me').set('Authorization', auth).expect(200);
      expect(before.body).toEqual({ id: 'me-1', username: 'api-user-1', displayName: 'Me', role: 'COMMITTEE', schoolId: null });

      const user = (await api.usersRepo.findById('me-1'))!;
      user.role = 'TEAM_LEADER';
      user.schoolId = 'school-9';
      const after = await http().get('/auth/me').set('Authorization', auth).expect(200);
      expect(after.body).toMatchObject({ role: 'TEAM_LEADER', schoolId: 'school-9' });
      expect(JSON.stringify(after.body)).not.toContain('passwordHash');
    });
  });

  describe('GET /schedule/export (public)', () => {
    it('200 CSV attachment without auth, header row + one row per slot', async () => {
      const res = await http().get('/schedule/export').expect(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('tmo-verification-schedule.csv');
      const lines = res.text.replace(/^﻿/, '').trim().split(/\r?\n/);
      expect(lines[0]).toBe('ช่วงเวลา,ข้อ 1,ข้อ 2,ข้อ 3,ข้อ 4,ข้อ 5');
      expect(lines.length).toBeGreaterThan(1);
    });
  });
});
