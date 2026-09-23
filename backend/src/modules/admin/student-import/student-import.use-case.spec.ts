import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { StudentImportUseCase } from './student-import.use-case';
import { FakeSchoolsRepository } from '../../../testing/fake-schools.repository';
import { FakeStudentsRepository } from '../../../testing/fake-students.repository';

function setUp() {
  const schools = new FakeSchoolsRepository();
  schools.seed({ id: 'school-1', name: 'KMUTNB', code: 'KMUTNB' });
  const students = new FakeStudentsRepository();
  return { students, useCase: new StudentImportUseCase(schools, students) };
}

const csv = (body: string) => Buffer.from(`schoolCode,seqNo,name\n${body}\n`, 'utf8');

describe('StudentImportUseCase (SPEC §4.1)', () => {
  it('preview reports valid/error counts and writes nothing', async () => {
    const { useCase, students } = setUp();
    const res = await useCase.preview(csv('KMUTNB,1,เด็กชาย ก\nNOPE,2,เด็กชาย ข'), 'a.csv');
    expect(res).toMatchObject({ validCount: 1, errorCount: 1 });
    expect(res.rows.find((r) => !r.ok)).toBeDefined();
    expect(students.students).toHaveLength(0);
  });

  it('commit upserts only valid rows and returns the imported count', async () => {
    const { useCase, students } = setUp();
    const res = await useCase.commit(csv('KMUTNB,1,เด็กชาย ก\nNOPE,2,เด็กชาย ข\nKMUTNB,3,เด็กหญิง ค'), 'a.csv');
    expect(res).toEqual({ imported: 2 });
    expect(students.students.map((s) => s.studentCode).sort()).toEqual(['1KMUTNB', '3KMUTNB']);
  });

  it('commit is idempotent: re-importing the same file updates rather than duplicates', async () => {
    const { useCase, students } = setUp();
    await useCase.commit(csv('KMUTNB,1,ชื่อเดิม'), 'a.csv');
    await useCase.commit(csv('KMUTNB,1,ชื่อใหม่'), 'a.csv');
    expect(students.students).toHaveLength(1);
    expect(students.students[0].name).toBe('ชื่อใหม่');
  });

  it('commit with no valid rows is a 400', async () => {
    const { useCase } = setUp();
    await expect(useCase.commit(csv('NOPE,1,x'), 'a.csv')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('parses .xlsx the same as .csv', async () => {
    const { useCase } = setUp();
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('s');
    sheet.addRow(['schoolCode', 'seqNo', 'name']);
    sheet.addRow(['KMUTNB', 1, 'เด็กชาย ก']);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const res = await useCase.preview(buffer, 'a.xlsx');
    expect(res).toMatchObject({ validCount: 1, errorCount: 0 });
  });
});
