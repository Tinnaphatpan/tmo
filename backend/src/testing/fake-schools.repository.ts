import { School } from '../domain/entities';
import { SchoolsRepository, UpsertSchoolInput } from '../modules/schools/schools.repository';

export class FakeSchoolsRepository extends SchoolsRepository {
  readonly schools: School[] = [];

  seed(school: School): void {
    this.schools.push(school);
  }

  async findAll(): Promise<School[]> {
    return this.schools;
  }

  async findById(id: string): Promise<School | null> {
    return this.schools.find((s) => s.id === id) ?? null;
  }

  async findByCode(code: string): Promise<School | null> {
    return this.schools.find((s) => s.code?.toLowerCase() === code.toLowerCase()) ?? null;
  }

  async create(input: UpsertSchoolInput): Promise<School> {
    const school: School = { id: `school-${this.schools.length + 1}`, ...input };
    this.schools.push(school);
    return school;
  }

  async update(id: string, input: UpsertSchoolInput): Promise<School> {
    const school = this.schools.find((s) => s.id === id);
    if (!school) throw new Error('not found');
    school.name = input.name;
    school.code = input.code;
    return school;
  }

  async delete(id: string): Promise<void> {
    const index = this.schools.findIndex((s) => s.id === id);
    if (index >= 0) this.schools.splice(index, 1);
  }

  async hasQueueItems(): Promise<boolean> {
    return false;
  }
}
