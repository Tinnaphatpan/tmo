import { School } from '../../domain/entities';
import { Executor } from '../../database/types';

export interface UpsertSchoolInput {
  name: string;
  code: string | null;
}

export abstract class SchoolsRepository {
  abstract findAll(executor?: Executor): Promise<School[]>;
  abstract findById(id: string, executor?: Executor): Promise<School | null>;
  abstract findByCode(code: string, executor?: Executor): Promise<School | null>;
  abstract create(input: UpsertSchoolInput, executor?: Executor): Promise<School>;
  abstract update(id: string, input: UpsertSchoolInput, executor?: Executor): Promise<School>;
  abstract delete(id: string, executor?: Executor): Promise<void>;
  /** Used by the "can't delete a school with queue items still pending" guard (SPEC §2.5). */
  abstract hasQueueItems(id: string, executor?: Executor): Promise<boolean>;
}
