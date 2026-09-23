import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../domain/entities';
import { SettingsRepository } from '../settings/settings.repository';
import { RealtimeService } from '../realtime/realtime.service';
import { SetLockDto } from './dto/set-lock.dto';

// SPEC §2.5 PATCH /api/admin/settings/lock (ADMIN only).
@Controller('admin/settings')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSettingsController {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Patch('lock')
  async setLock(@CurrentUser() user: User, @Body() dto: SetLockDto) {
    const settings = await this.settingsRepository.setLocked(dto.locked, user.id);
    this.realtimeService.notifyChange();
    return { scoringLocked: settings.scoringLocked };
  }
}
