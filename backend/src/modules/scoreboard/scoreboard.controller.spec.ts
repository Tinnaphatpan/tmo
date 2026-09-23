import request from 'supertest';
import { ApiTestApp, createApiTestApp } from '../../testing/api-test-app';
import { FakeSchoolsRepository } from '../../testing/fake-schools.repository';
import { FakeScoresRepository } from '../../testing/fake-scores.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { ScoresRepository } from '../scores/scores.repository';
import { ScoreboardController } from './scoreboard.controller';
import { GetScoreboardUseCase } from './get-scoreboard.use-case';

describe('ScoreboardController (HTTP)', () => {
  let api: ApiTestApp;

  beforeEach(async () => {
    const schools = new FakeSchoolsRepository();
    schools.seed({ id: 's1', name: 'A School', code: 'A' });
    const scores = new FakeScoresRepository();
    scores.seedExportRow({
      schoolId: 's1',
      schoolName: 'A School',
      schoolCode: 'A',
      studentCode: 'a1',
      studentName: 'x',
      problemNumber: 2,
      value: 4.5,
      judgeDisplayName: 'j',
      judgeUsername: 'j',
      recordedAt: new Date(),
      seqNo: 1,
    });
    api = await createApiTestApp({
      controllers: [ScoreboardController],
      providers: [
        { provide: SchoolsRepository, useValue: schools },
        { provide: ScoresRepository, useValue: scores },
        GetScoreboardUseCase,
      ],
    });
  });

  afterEach(() => api.app.close());

  it('401 anonymous; 403 for ADMIN and TEAM_LEADER', async () => {
    const http = request(api.app.getHttpServer());
    await http.get('/scoreboard').expect(401);
    for (const role of ['ADMIN', 'TEAM_LEADER'] as const) {
      await http.get('/scoreboard').set('Authorization', api.login({ role })).expect(403);
    }
  });

  it('200 for COMMITTEE and STAFF with per-problem sums', async () => {
    const http = request(api.app.getHttpServer());
    for (const role of ['COMMITTEE', 'STAFF'] as const) {
      const res = await http.get('/scoreboard').set('Authorization', api.login({ role })).expect(200);
      expect(res.body).toEqual([
        { schoolName: 'A School', schoolCode: 'A', problems: [null, 4.5, null, null, null], total: 4.5 },
      ]);
    }
  });
});
