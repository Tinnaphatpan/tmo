import { Module } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';
import { MssqlSettingsRepository } from './settings.repository.mssql';

@Module({
  providers: [{ provide: SettingsRepository, useClass: MssqlSettingsRepository }],
  exports: [SettingsRepository],
})
export class SettingsModule {}
