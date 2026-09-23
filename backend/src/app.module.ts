import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { QueueModule } from './modules/queue/queue.module';
import { ScoreEditRequestsModule } from './modules/scores/score-edit-requests.module';
import { AdminModule } from './modules/admin/admin.module';
import { TeamLeaderModule } from './modules/team-leader/team-leader.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    AuthModule,
    QueueModule,
    ScoreEditRequestsModule,
    AdminModule,
    TeamLeaderModule,
    ApprovalModule,
    ScheduleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
