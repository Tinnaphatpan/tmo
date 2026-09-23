import { Module } from '@nestjs/common';
import { SchoolsModule } from '../schools/schools.module';
import { ScheduleController } from './schedule.controller';
import { GetScheduleExportUseCase } from './get-schedule-export.use-case';

@Module({
  imports: [SchoolsModule],
  controllers: [ScheduleController],
  providers: [GetScheduleExportUseCase],
})
export class ScheduleModule {}
