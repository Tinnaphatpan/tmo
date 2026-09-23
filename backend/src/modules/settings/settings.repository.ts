import { CompetitionSettings } from '../../domain/entities';
import { Executor } from '../../database/types';

export abstract class SettingsRepository {
  /** Row is seeded by migration 001 — always exists, never null (SPEC §2.1). */
  abstract get(executor?: Executor): Promise<CompetitionSettings>;
  abstract setLocked(
    locked: boolean,
    lockedBy: string | null,
    executor?: Executor,
  ): Promise<CompetitionSettings>;
}
