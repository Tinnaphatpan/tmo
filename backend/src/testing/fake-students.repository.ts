import { Student } from '../domain/entities';
import { StudentsRepository, UpsertStudentInput } from '../modules/students/students.repository';

export class FakeStudentsRepository extends StudentsRepository {
  readonly students: Student[] = [];

  seed(student: Student): void {
    this.students.push(student);
  }

  async findBySchool(schoolId: string): Promise<Student[]> {
    return this.students.filter((s) => s.schoolId === schoolId).sort((a, b) => a.seqNo - b.seqNo);
  }

  async findBySchools(schoolIds: string[]): Promise<Student[]> {
    return this.students
      .filter((s) => schoolIds.includes(s.schoolId))
      .sort((a, b) => a.schoolId.localeCompare(b.schoolId) || a.seqNo - b.seqNo);
  }

  async findById(id: string): Promise<Student | null> {
    return this.students.find((s) => s.id === id) ?? null;
  }

  async findByIds(ids: string[]): Promise<Student[]> {
    return this.students.filter((s) => ids.includes(s.id));
  }

  async upsert(input: UpsertStudentInput): Promise<Student> {
    const existing = this.students.find(
      (s) => s.schoolId === input.schoolId && s.seqNo === input.seqNo,
    );
    if (existing) {
      existing.name = input.name;
      existing.studentCode = input.studentCode;
      return existing;
    }
    const student: Student = {
      id: `student-${this.students.length + 1}`,
      schoolId: input.schoolId,
      seqNo: input.seqNo,
      name: input.name,
      studentCode: input.studentCode,
    };
    this.students.push(student);
    return student;
  }

  async delete(id: string): Promise<void> {
    const index = this.students.findIndex((s) => s.id === id);
    if (index >= 0) this.students.splice(index, 1);
  }

  async countAll(): Promise<number> {
    return this.students.length;
  }
}

export function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: 'student-1',
    studentCode: '1XXX',
    seqNo: 1,
    name: 'เด็กชายทดสอบ',
    schoolId: 'school-1',
    ...overrides,
  };
}
