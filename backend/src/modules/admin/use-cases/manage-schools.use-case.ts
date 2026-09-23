import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation } from '../../../common/errors/sql-error.util';
import { School } from '../../../domain/entities';
import { SchoolsRepository, UpsertSchoolInput } from '../../schools/schools.repository';

/** SPEC §2.5 — POST/PATCH/DELETE /api/admin/schools. */
@Injectable()
export class ManageSchoolsUseCase {
  constructor(private readonly schoolsRepository: SchoolsRepository) {}

  async create(input: UpsertSchoolInput): Promise<School> {
    try {
      return await this.schoolsRepository.create(input);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('ชื่อโรงเรียนนี้มีอยู่แล้ว');
      throw err;
    }
  }

  async update(id: string, input: UpsertSchoolInput): Promise<School> {
    if (!(await this.schoolsRepository.findById(id))) {
      throw new NotFoundException('ไม่พบโรงเรียนนี้');
    }
    try {
      return await this.schoolsRepository.update(id, input);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('ชื่อโรงเรียนนี้มีอยู่แล้ว');
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const hasQueueItems = await this.schoolsRepository.hasQueueItems(id);
    if (hasQueueItems) {
      throw new ConflictException('ไม่สามารถลบโรงเรียนที่ยังมีรายการคิวค้างอยู่');
    }
    await this.schoolsRepository.delete(id);
  }
}
