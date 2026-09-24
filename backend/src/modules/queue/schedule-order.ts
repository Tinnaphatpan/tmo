/**
 * Order of the 16 verification centres on the printed schedule: problem 1
 * runs through them top to bottom, the other problems are rotated copies of
 * it (SPEC §2.4). The rotation only reproduces the poster if the schools are
 * fed to `generateSchedule` in this order, so schedule generation sorts by it
 * (unknown codes go last, by name).
 */
export const SCHEDULE_SCHOOL_ORDER = [
  'CMU',
  'KKU',
  'SU',
  'SA-SWU',
  'WU',
  'MWIT',
  'PSUHY',
  'YB-KU',
  'KMUTNB',
  'RS',
  'PSUPN',
  'NU',
  'AFAPS',
  'BUU',
  'UBU',
  'SK-KMUTT',
] as const;

export function sortSchoolsForSchedule<T extends { name: string; code: string | null }>(
  schools: T[],
): T[] {
  const rank = (s: T) => {
    const i = s.code ? (SCHEDULE_SCHOOL_ORDER as readonly string[]).indexOf(s.code) : -1;
    return i === -1 ? SCHEDULE_SCHOOL_ORDER.length : i;
  };
  return [...schools].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'th'));
}
