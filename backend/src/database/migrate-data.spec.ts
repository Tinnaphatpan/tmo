import * as fs from 'fs';
import * as path from 'path';
import { parseCopyBlocks, toBool, toDate, toDecimal, unescapeCopyField } from './migrate-data';

describe('unescapeCopyField', () => {
  it('unescapes tab, newline, and backslash', () => {
    expect(unescapeCopyField('a\\tb')).toBe('a\tb');
    expect(unescapeCopyField('a\\nb')).toBe('a\nb');
    expect(unescapeCopyField('a\\\\b')).toBe('a\\b');
  });

  it('leaves plain text (including Thai) untouched', () => {
    expect(unescapeCopyField('ศูนย์ สอวน.')).toBe('ศูนย์ สอวน.');
  });
});

describe('type coercions', () => {
  it('toBool reads pg COPY t/f', () => {
    expect(toBool('t')).toBe(true);
    expect(toBool('f')).toBe(false);
  });

  it('toDate parses a pg timestamp and passes through null', () => {
    expect(toDate(null)).toBeNull();
    expect(toDate('2026-08-28 15:20:55.827')?.getUTCFullYear()).toBe(2026);
  });

  it('toDecimal parses numeric strings and passes through null', () => {
    expect(toDecimal('9.5')).toBe(9.5);
    expect(toDecimal(null)).toBeNull();
  });
});

describe('parseCopyBlocks', () => {
  it('parses a minimal synthetic dump with NULLs and multiple tables', () => {
    const text = [
      'COPY public."School" (id, name, code) FROM stdin;',
      'abc\tโรงเรียน A\tA',
      'def\tโรงเรียน B\t\\N',
      '\\.',
      '',
      'COPY public."User" (id, username, "schoolId") FROM stdin;',
      'u1\tadmin\t\\N',
      '\\.',
    ].join('\n');

    const blocks = parseCopyBlocks(text);

    expect(blocks.get('School')?.rows).toHaveLength(2);
    expect(blocks.get('School')?.rows[0]).toEqual({ id: 'abc', name: 'โรงเรียน A', code: 'A' });
    expect(blocks.get('School')?.rows[1].code).toBeNull();

    expect(blocks.get('User')?.rows).toEqual([{ id: 'u1', username: 'admin', schoolId: null }]);
  });

  it('parses the real backup dump end to end (SPEC §9)', () => {
    const dumpPath = path.resolve(__dirname, '../../../backup');
    const files = fs.readdirSync(dumpPath).filter((f) => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);

    const text = fs.readFileSync(path.join(dumpPath, files[0]), 'utf8');
    const blocks = parseCopyBlocks(text);

    // SPEC §9: 16 real verification centres in the backup.
    expect(blocks.get('School')?.rows).toHaveLength(16);
    expect(blocks.get('User')?.rows.length).toBeGreaterThanOrEqual(7); // admin + 5 committee + mentor1
    expect(blocks.get('CommitteeAssignment')?.rows).toHaveLength(5);

    const schoolCodes = blocks.get('School')!.rows.map((r) => r.code);
    expect(schoolCodes).toContain('KMUTNB');
    expect(new Set(schoolCodes).size).toBe(16); // all unique, matches UQ_School_Name-adjacent expectation
  });
});
