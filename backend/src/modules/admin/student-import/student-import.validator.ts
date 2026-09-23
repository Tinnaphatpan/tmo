import { School } from '../../../domain/entities';

export interface ParsedStudentRow {
  ok: boolean;
  schoolCode: string | null;
  seqNo: number | null;
  name: string | null;
  studentCode: string | null;
  schoolId: string | null;
  error: string | null;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** SPEC §4.1 — header matched fuzzily: lowercased, non-letters stripped, then substring match. */
function findColumn(headers: string[], keyword: string): string | undefined {
  return headers.find((h) => normalizeHeader(h).includes(keyword));
}

/**
 * SPEC §4.1 validateRows(): schoolCode must resolve to an existing School.code
 * (case-insensitive), seqNo must be an integer 1-6, name must be non-empty,
 * and (schoolCode, seqNo) must be unique within the file itself (not checked
 * against the DB — this is an upsert).
 */
export function validateStudentRows(
  rawRows: Record<string, string>[],
  schools: School[],
): ParsedStudentRow[] {
  if (rawRows.length === 0) return [];

  const headers = Object.keys(rawRows[0]);
  const schoolCodeCol = findColumn(headers, 'schoolcode');
  const seqNoCol = findColumn(headers, 'seqno');
  const nameCol = findColumn(headers, 'name');

  const schoolsByCode = new Map(
    schools.filter((s) => s.code).map((s) => [s.code!.toLowerCase(), s]),
  );
  const seenKeys = new Set<string>();

  return rawRows.map((raw) => {
    const schoolCode = schoolCodeCol ? raw[schoolCodeCol]?.trim() : '';
    const seqNoRaw = seqNoCol ? raw[seqNoCol]?.trim() : '';
    const name = nameCol ? raw[nameCol]?.trim() : '';

    if (!schoolCode) {
      return fail(schoolCode, null, name, 'ไม่พบคอลัมน์รหัสศูนย์สอบ');
    }
    const school = schoolsByCode.get(schoolCode.toLowerCase());
    if (!school) {
      return fail(schoolCode, null, name, `ไม่พบโรงเรียนรหัส "${schoolCode}"`);
    }

    const seqNo = Number(seqNoRaw);
    if (!Number.isInteger(seqNo) || seqNo < 1 || seqNo > 6) {
      return fail(schoolCode, null, name, 'seqNo ต้องเป็นจำนวนเต็ม 1-6');
    }

    if (!name) {
      return fail(schoolCode, seqNo, name, 'ต้องระบุชื่อ');
    }

    const dedupeKey = `${schoolCode.toLowerCase()}:${seqNo}`;
    if (seenKeys.has(dedupeKey)) {
      return fail(schoolCode, seqNo, name, `seqNo ${seqNo} ซ้ำภายในโรงเรียนเดียวกันในไฟล์นี้`);
    }
    seenKeys.add(dedupeKey);

    return {
      ok: true,
      schoolCode,
      seqNo,
      name,
      studentCode: `${seqNo}${school.code}`,
      schoolId: school.id,
      error: null,
    };
  });
}

function fail(
  schoolCode: string | null,
  seqNo: number | null,
  name: string | null,
  error: string,
): ParsedStudentRow {
  return { ok: false, schoolCode, seqNo, name, studentCode: null, schoolId: null, error };
}
