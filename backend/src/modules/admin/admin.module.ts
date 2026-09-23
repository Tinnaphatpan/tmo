import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SchoolsModule } from '../schools/schools.module';
import { StudentsModule } from '../students/students.module';
import { UsersModule } from '../users/users.module';
import { CommitteeAssignmentModule } from '../committee/committee-assignment.module';
import { QueueModule } from '../queue/queue.module';
import { ScoresDataModule } from '../scores/scores-data.module';
import { SettingsModule } from '../settings/settings.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { AdminSchoolsController } from './admin-schools.controller';
import { AdminCommitteeController } from './admin-committee.controller';
import { AdminQueueController } from './admin-queue.controller';
import { AdminStudentsController } from './admin-students.controller';
import { AdminScoresController } from './admin-scores.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminScoreEditRequestsController } from './admin-score-edit-requests.controller';
import { AdminAuditLogController } from './admin-audit-log.controller';
import { AdminDashboardController } from './admin-dashboard.controller';

import { ManageSchoolsUseCase } from './use-cases/manage-schools.use-case';
import { ManageCommitteeUseCase } from './use-cases/manage-committee.use-case';
import { ListCommitteeUseCase } from './use-cases/list-committee.use-case';
import { ManageQueueUseCase } from './use-cases/manage-queue.use-case';
import { GetDashboardUseCase } from './use-cases/get-dashboard.use-case';
import { StudentImportUseCase } from './student-import/student-import.use-case';
import { ReviewScoreEditRequestUseCase } from '../scores/use-cases/review-score-edit-request.use-case';

@Module({
  imports: [
    AuthModule,
    SchoolsModule,
    StudentsModule,
    UsersModule,
    CommitteeAssignmentModule,
    QueueModule,
    ScoresDataModule,
    SettingsModule,
    AuditLogModule,
    RealtimeModule,
  ],
  controllers: [
    AdminSchoolsController,
    AdminCommitteeController,
    AdminQueueController,
    AdminStudentsController,
    AdminScoresController,
    AdminSettingsController,
    AdminScoreEditRequestsController,
    AdminAuditLogController,
    AdminDashboardController,
  ],
  providers: [
    ManageSchoolsUseCase,
    ManageCommitteeUseCase,
    ListCommitteeUseCase,
    ManageQueueUseCase,
    GetDashboardUseCase,
    StudentImportUseCase,
    ReviewScoreEditRequestUseCase,
  ],
})
export class AdminModule {}
