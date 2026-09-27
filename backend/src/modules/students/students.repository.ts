import { Student } from '../../domain/entities';
import { Executor } from '../../database/types';

export interface UpsertStudentInput {
  schoolId: string;
  seqNo: number;
  name: string;
  studentCode: string;
}

export abstract class StudentsRepository {
  abstract findBySchool(schoolId: string, executor?: Executor): Promise<Student[]>;
  /** One round trip for many schools; ordered by SchoolId then SeqNo. */
  abstract findBySchools(schoolIds: string[], executor?: Executor): Promise<Student[]>;
  abstract findById(id: string, executor?: Executor): Promise<Student | null>;
  abstract findByIds(ids: string[], executor?: Executor): Promise<Student[]>;
  /** Upsert keyed on (SchoolId, SeqNo) — used by the student import commit (SPEC §4.1). */
  abstract upsert(input: UpsertStudentInput, executor?: Executor): Promise<Student>;
  abstract delete(id: string, executor?: Executor): Promise<void>;
  abstract countAll(executor?: Executor): Promise<number>;
}
