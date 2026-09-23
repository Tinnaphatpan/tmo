import { GetScheduleExportUseCase } from './get-schedule-export.use-case';
import { FakeSchoolsRepository } from '../../testing/fake-schools.repository';

describe('GetScheduleExportUseCase (SPEC §4.3)', () => {
  async function csvFor(count: number): Promise<string[][]> {
    const repo = new FakeSchoolsRepository();
    for (let i = 1; i <= count; i++) repo.seed({ id: `s${i}`, name: `School ${i}`, code: `C${i}` });
    const csv = await new GetScheduleExportUseCase(repo).execute();
    return csv
      .replace(/^﻿/, '')
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split(','));
  }

  it('has a header of time + 5 problem columns and one row per slot', async () => {
    const rows = await csvFor(16);
    expect(rows[0]).toEqual(['ช่วงเวลา', 'ข้อ 1', 'ข้อ 2', 'ข้อ 3', 'ข้อ 4', 'ข้อ 5']);
    expect(rows.length - 1).toBe(16); // as many slots as schools in a full rotation
    expect(rows[1][0]).toMatch(/^\d{2}:\d{2}-\d{2}:\d{2}$/);
  });

  it('every school appears exactly once per problem column, never twice in one slot', async () => {
    const rows = (await csvFor(16)).slice(1);
    for (let col = 1; col <= 5; col++) {
      const codes = rows.map((r) => r[col]).sort();
      expect(new Set(codes).size).toBe(16);
    }
    for (const row of rows) {
      const filled = row.slice(1).filter(Boolean);
      expect(new Set(filled).size).toBe(filled.length);
    }
  });
});
