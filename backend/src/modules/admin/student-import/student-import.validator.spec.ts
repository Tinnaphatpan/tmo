import { validateStudentRows } from './student-import.validator';
import { School } from '../../../domain/entities';

const schools: School[] = [
  { id: 'school-1', name: 'KMUTNB', code: 'KMUTNB' },
  { id: 'school-2', name: 'CU', code: 'CU' },
];

describe('validateStudentRows (SPEC §4.1)', () => {
  it('matches fuzzy header variants (School Code / schoolCode / school_code) the same way', () => {
    for (const header of ['School Code', 'schoolCode', 'school_code']) {
      const rows = validateStudentRows(
        [{ [header]: 'KMUTNB', seqNo: '1', name: 'เด็กชายทดสอบ' }],
        schools,
      );
      expect(rows[0].ok).toBe(true);
      expect(rows[0].studentCode).toBe('1KMUTNB');
    }
  });

  it('matches schoolCode case-insensitively against School.code', () => {
    const rows = validateStudentRows(
      [{ schoolCode: 'kmutnb', seqNo: '2', name: 'เด็กหญิงทดสอบ' }],
      schools,
    );
    expect(rows[0].ok).toBe(true);
    expect(rows[0].schoolId).toBe('school-1');
  });

  it('rejects an unknown school code with the exact SPEC error message', () => {
    const rows = validateStudentRows(
      [{ schoolCode: 'XXX', seqNo: '1', name: 'เด็ก' }],
      schools,
    );
    expect(rows[0].ok).toBe(false);
    expect(rows[0].error).toBe('ไม่พบโรงเรียนรหัส "XXX"');
  });

  it('rejects seqNo outside 1-6', () => {
    for (const bad of ['0', '7', 'abc', '1.5']) {
      const rows = validateStudentRows(
        [{ schoolCode: 'CU', seqNo: bad, name: 'เด็ก' }],
        schools,
      );
      expect(rows[0].ok).toBe(false);
      expect(rows[0].error).toBe('seqNo ต้องเป็นจำนวนเต็ม 1-6');
    }
  });

  it('rejects an empty name', () => {
    const rows = validateStudentRows([{ schoolCode: 'CU', seqNo: '1', name: '' }], schools);
    expect(rows[0].ok).toBe(false);
    expect(rows[0].error).toBe('ต้องระบุชื่อ');
  });

  it('flags a duplicate (schoolCode, seqNo) pair within the same file, keeping the first row valid', () => {
    const rows = validateStudentRows(
      [
        { schoolCode: 'CU', seqNo: '1', name: 'คนแรก' },
        { schoolCode: 'CU', seqNo: '1', name: 'คนซ้ำ' },
      ],
      schools,
    );
    expect(rows[0].ok).toBe(true);
    expect(rows[1].ok).toBe(false);
    expect(rows[1].error).toContain('ซ้ำ');
  });

  it('generates studentCode as seqNo + school code', () => {
    const rows = validateStudentRows([{ schoolCode: 'CU', seqNo: '3', name: 'เด็ก' }], schools);
    expect(rows[0].studentCode).toBe('3CU');
  });
});
