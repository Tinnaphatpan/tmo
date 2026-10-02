import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { interval, map, merge, Observable, of } from 'rxjs';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../domain/entities';
import { RealtimeService } from '../realtime/realtime.service';
import { GetPublicQueueUseCase, PublicQueueResult } from './use-cases/get-public-queue.use-case';
import { GetMyQueueUseCase, MyQueueResult } from './use-cases/get-my-queue.use-case';
import { ClaimQueueItemUseCase } from './use-cases/claim-queue-item.use-case';
import { ReleaseQueueItemUseCase } from './use-cases/release-queue-item.use-case';
import { SkipQueueItemUseCase } from './use-cases/skip-queue-item.use-case';
import { SubmitScoreUseCase } from './use-cases/submit-score.use-case';
import { SubmitScoreDto } from './dto/submit-score.dto';

const PING_INTERVAL_MS = 25_000;

@Controller('queue')
export class QueueController {
  constructor(
    private readonly getPublicQueue: GetPublicQueueUseCase,
    private readonly getMyQueue: GetMyQueueUseCase,
    private readonly claimQueueItem: ClaimQueueItemUseCase,
    private readonly releaseQueueItem: ReleaseQueueItemUseCase,
    private readonly skipQueueItem: SkipQueueItemUseCase,
    private readonly submitScore: SubmitScoreUseCase,
    private readonly realtimeService: RealtimeService,
  ) {}

  // ---- Public (SPEC §2.5) ----

  @Get()
  getQueue(): Promise<PublicQueueResult> {
    return this.getPublicQueue.execute();
  }

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    const ready$ = of<MessageEvent>({ type: 'ready', data: new Date().toISOString() });
    const changed$ = this.realtimeService.stream.pipe(
      map((): MessageEvent => ({ type: 'changed', data: new Date().toISOString() })),
    );
    const ping$ = interval(PING_INTERVAL_MS).pipe(
      map((): MessageEvent => ({ type: 'ping', data: new Date().toISOString() })),
    );
    return merge(ready$, changed$, ping$);
  }

  // ---- Committee (SPEC §2.5) ----

  @Get('mine')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COMMITTEE', 'STAFF', 'ADMIN')
  getMine(@CurrentUser() user: User): Promise<MyQueueResult> {
    return this.getMyQueue.execute(user.id, user.role === 'ADMIN');
  }

  // ADMIN may also claim/grade directly (e.g. covering when nobody else is
  // available) — bypasses the UserAssignment scope check COMMITTEE/STAFF are
  // held to, see ClaimQueueItemUseCase's `isAdmin` param.
  @Post(':id/claim')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COMMITTEE', 'STAFF', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async claim(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    await this.claimQueueItem.execute(user.id, id, user.role === 'ADMIN');
    this.realtimeService.notifyChange();
    return { ok: true };
  }

  @Post(':id/score')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COMMITTEE', 'STAFF', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async score(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SubmitScoreDto,
  ): Promise<{ ok: true }> {
    await this.submitScore.execute({ queueItemId: id, judgeId: user.id, scores: dto.scores });
    this.realtimeService.notifyChange();
    return { ok: true };
  }

  // Release + move to the end of this problem's queue (Phase B5).
  @Post(':id/skip')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COMMITTEE', 'STAFF', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async skip(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    await this.skipQueueItem.execute({ queueItemId: id, userId: user.id });
    this.realtimeService.notifyChange();
    return { ok: true };
  }

  // Shared by committee/staff (release own) and admin (force-release any) — SPEC §2.5.
  @Post(':id/release')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COMMITTEE', 'STAFF', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async release(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    await this.releaseQueueItem.execute({
      queueItemId: id,
      userId: user.id,
      isAdmin: user.role === 'ADMIN',
    });
    this.realtimeService.notifyChange();
    return { ok: true };
  }
}
