import { generateSchedule, pickRotationStep } from './rotation';

function makeSchools(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `school-${i}`, code: `S${i}` }));
}

describe('pickRotationStep', () => {
  it('picks 13 for 16 schools, matching the historical TMO23 rotation', () => {
    expect(pickRotationStep(16)).toBe(13);
  });

  it('always returns a value coprime with n', () => {
    for (const n of [4, 5, 7, 12, 16, 20, 21]) {
      const step = pickRotationStep(n);
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      expect(gcd(step, n)).toBe(1);
    }
  });
});

describe('generateSchedule', () => {
  it('produces exactly schools × problems cells for the default 16/5 case', () => {
    const cells = generateSchedule(makeSchools(16));
    expect(cells).toHaveLength(16 * 5);
  });

  it('gives every school every problem exactly once (no gaps, no repeats)', () => {
    const schools = makeSchools(16);
    const cells = generateSchedule(schools);
    const seen = new Set<string>();
    for (const cell of cells) {
      const key = `${cell.schoolId}:${cell.problemNumber}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(16 * 5);
  });

  it('never schedules two problems for the same school in the same slot', () => {
    const cells = generateSchedule(makeSchools(16));
    const bySlot = new Map<number, Set<string>>();
    for (const cell of cells) {
      const set = bySlot.get(cell.slot) ?? new Set<string>();
      expect(set.has(cell.schoolId)).toBe(false);
      set.add(cell.schoolId);
      bySlot.set(cell.slot, set);
    }
  });

  it('spaces slots 15 minutes apart starting at 13:30 by default', () => {
    const cells = generateSchedule(makeSchools(16), {
      scheduleDate: new Date('2026-01-10T00:00:00'),
    });
    const slot0 = cells.find((c) => c.problemNumber === 1 && c.slot === 0)!;
    const slot1 = cells.find((c) => c.problemNumber === 1 && c.slot === 1)!;
    expect(slot0.scheduledAt.getHours()).toBe(13);
    expect(slot0.scheduledAt.getMinutes()).toBe(30);
    expect(slot1.scheduledAt.getTime() - slot0.scheduledAt.getTime()).toBe(15 * 60_000);
  });

  it('still covers every school/problem pair once when the school count is not 16', () => {
    const schools = makeSchools(13); // prime, always coprime-friendly
    const cells = generateSchedule(schools, { problemCount: 5 });
    const seen = new Set<string>();
    for (const cell of cells) seen.add(`${cell.schoolId}:${cell.problemNumber}`);
    expect(seen.size).toBe(13 * 5);
  });
});

describe('generateSchedule firstSlotAt (timezone-safe anchor)', () => {
  it('starts slot 0 exactly at firstSlotAt and steps by slotMinutes, ignoring the server timezone', () => {
    const firstSlotAt = new Date('2026-05-17T13:30:00+07:00');
    const schools = Array.from({ length: 16 }, (_, i) => ({ id: `s${i}`, code: `C${i}` }));
    const cells = generateSchedule(schools, { firstSlotAt, slotMinutes: 15 });
    expect(cells).toHaveLength(80);
    const slot0 = cells.find((c) => c.slot === 0)!;
    const slot15 = cells.find((c) => c.slot === 15)!;
    expect(slot0.scheduledAt.toISOString()).toBe('2026-05-17T06:30:00.000Z');
    expect(slot15.scheduledAt.toISOString()).toBe('2026-05-17T10:15:00.000Z'); // 17:15 Bangkok
  });
});
