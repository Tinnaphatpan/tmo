import { BadRequestException, Injectable } from '@nestjs/common';
import { SchoolsRepository } from '../../schools/schools.repository';
import { StudentsRepository } from '../../students/students.repository';
import { parseStudentImportFile } from './student-import.parser';
import { ParsedStudentRow, validateStudentRows } from './student-import.validator';

export interface StudentImportPreview {
  rows: ParsedStudentRow[];
  validCount: number;
  errorCount: number;
}

/** SPEC §4.1 — two-step preview/commit import, re-parsed from the same file both times. */
@Injectable()
export class StudentImportUseCase {
  constructor(
    private readonly schoolsRepository: SchoolsRepository,
    private readonly studentsRepository: StudentsRepository,
  ) {}

  private async parseAndValidate(buffer: Buffer, filename: string): Promise<ParsedStudentRow[]> {
    const schools = await this.schoolsRepository.findAll();
    const rawRows = await parseStudentImportFile(buffer, filename);
    return validateStudentRows(rawRows, schools);
  }

  async preview(buffer: Buffer, filename: string): Promise<StudentImportPreview> {
    const rows = await this.parseAndValidate(buffer, filename);
    return {
      rows,
      validCount: rows.filter((r) => r.ok).length,
      errorCount: rows.filter((r) => !r.ok).length,
    };
  }

  async commit(buffer: Buffer, filename: string): Promise<{ imported: number }> {
    const rows = await this.parseAndValidate(buffer, filename);
    const validRows = rows.filter((r) => r.ok);
    if (validRows.length === 0) {
      throw new BadRequestException('ไม่มีแถวที่ถูกต้องให้นำเข้า');
    }

    for (const row of validRows) {
      await this.studentsRepository.upsert({
        schoolId: row.schoolId!,
        seqNo: row.seqNo!,
        name: row.name!,
        studentCode: row.studentCode!,
      });
    }

    return { imported: validRows.length };
  }
}
