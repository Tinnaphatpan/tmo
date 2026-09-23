import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SchoolsModule } from '../schools/schools.module';
import { StudentsModule } from '../students/students.module';
import { ScoresDataModule } from '../scores/scores-data.module';
import { MentorController } from './mentor.controller';
import { GetMentorReportUseCase } from './get-mentor-report.use-case';

@Module({
  imports: [AuthModule, SchoolsModule, StudentsModule, ScoresDataModule],
  controllers: [MentorController],
  providers: [GetMentorReportUseCase],
})
export class MentorModule {}
