// Rotation/scheduling algorithm (SPEC.md §2.4).
//
// centre(slot, problemIndex) = SCHOOLS[(slot + ROTATION_STEP * problemIndex) % N]
// ROTATION_STEP = 13 for N=16 (≡ -3 mod 16, coprime with 16) — every school
// meets every problem exactly once, and never meets two problems in the same
// time slot (see generateSchedule's own note below for why).

export interface RotationSchool {
  id: string;
  code: string | null;
}

export interface ScheduleCell {
  schoolId: string;
  schoolCode: string | null;
  problemNumber: number; // 1-based
  slot: number; // 0-based
  scheduledAt: Date;
}

export interface RotationOptions {
  problemCount?: number;
  slotMinutes?: number;
  firstSlotHour?: number;
  firstSlotMinute?: number;
  rotationStep?: number;
  scheduleDate?: Date;
  /** Exact start of slot 0; when given, firstSlotHour/Minute and scheduleDate are ignored (timezone-safe). */
  firstSlotAt?: Date;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Picks a rotation step coprime with `n` so the modular walk visits every
 * school exactly once per problem (SPEC §2.4's requirement if the school
 * count ever changes from 16). Prefers the historical "-3 mod n" congruence
 * and falls back to the nearest coprime value.
 */
export function pickRotationStep(n: number): number {
  if (n <= 2) return 1;
  const preferred = (((n - 3) % n) + n) % n || n - 1;
  if (gcd(preferred, n) === 1) return preferred;
  for (let delta = 1; delta < n; delta++) {
    for (const candidate of [preferred + delta, preferred - delta]) {
      const step = ((candidate % n) + n) % n;
      if (step !== 0 && gcd(step, n) === 1) return step;
    }
  }
  return 1;
}

/**
 * Generates the full rotation grid: one cell per (school, problemNumber)
 * pair, each carrying the wall-clock time it should start.
 *
 * Why no school is ever double-booked within a slot: for a fixed slot s,
 * the schools examined across problemIndex 0..problemCount-1 are
 * SCHOOLS[(s + step*p) % n] for p = 0..problemCount-1. Their offsets
 * (step*p mod n) are pairwise distinct whenever step is coprime with n and
 * problemCount <= n (which holds — 5 problems, 16 schools) — so the offsets,
 * and therefore the schools, never collide within one slot.
 */
export function generateSchedule(
  schools: RotationSchool[],
  options: RotationOptions = {},
): ScheduleCell[] {
  const n = schools.length;
  const problemCount = options.problemCount ?? 5;
  const step = options.rotationStep ?? pickRotationStep(n);
  const slotMinutes = options.slotMinutes ?? 15;

  let anchor: Date;
  if (options.firstSlotAt) {
    anchor = new Date(options.firstSlotAt);
  } else {
    anchor = options.scheduleDate ? new Date(options.scheduleDate) : new Date();
    anchor.setHours(options.firstSlotHour ?? 13, options.firstSlotMinute ?? 30, 0, 0);
  }

  const cells: ScheduleCell[] = [];
  for (let p = 0; p < problemCount; p++) {
    for (let s = 0; s < n; s++) {
      const school = schools[(s + step * p) % n];
      cells.push({
        schoolId: school.id,
        schoolCode: school.code,
        problemNumber: p + 1,
        slot: s,
        scheduledAt: new Date(anchor.getTime() + s * slotMinutes * 60_000),
      });
    }
  }
  return cells;
}
