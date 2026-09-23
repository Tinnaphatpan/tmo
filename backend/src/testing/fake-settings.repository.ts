import { CompetitionSettings } from '../domain/entities';
import { SettingsRepository } from '../modules/settings/settings.repository';

export class FakeSettingsRepository extends SettingsRepository {
  private settings: CompetitionSettings = {
    id: 1,
    scoringLocked: false,
    lockedAt: null,
    lockedBy: null,
  };

  seed(settings: Partial<CompetitionSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  async get(): Promise<CompetitionSettings> {
    return this.settings;
  }

  async setLocked(locked: boolean, lockedBy: string | null): Promise<CompetitionSettings> {
    this.settings = {
      ...this.settings,
      scoringLocked: locked,
      lockedAt: locked ? new Date() : this.settings.lockedAt,
      lockedBy: locked ? lockedBy : this.settings.lockedBy,
    };
    return this.settings;
  }
}
