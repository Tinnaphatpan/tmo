import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SchoolsModule } from '../schools/schools.module';
import { StudentsModule } from '../students/students.module';
import { UsersModule } from '../users/users.module';
import { UserAssignmentModule } from '../user-assignment/user-assignment.module';
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
import { AdminAuditLogController } from './admin-audit-log.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminStaffController } from './admin-staff.controller';

import { ManageSchoolsUseCase } from './use-cases/manage-schools.use-case';
import { ManageCommitteeUseCase } from './use-cases/manage-committee.use-case';
import { ListCommitteeUseCase } from './use-cases/list-committee.use-case';
import { ManageQueueUseCase } from './use-cases/manage-queue.use-case';
import { GetDashboardUseCase } from './use-cases/get-dashboard.use-case';
import { StudentImportUseCase } from './student-import/student-import.use-case';
import { UploadSignatureUseCase } from './use-cases/upload-signature.use-case';
import { ManageStaffAssignmentsUseCase } from './use-cases/manage-staff.use-case';
import { ListStaffUseCase } from './use-cases/list-staff.use-case';

@Module({
  imports: [
    AuthModule,
    SchoolsModule,
    StudentsModule,
    UsersModule,
    UserAssignmentModule,
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
    AdminAuditLogController,
    AdminDashboardController,
    AdminUsersController,
    AdminStaffController,
  ],
  providers: [
    ManageSchoolsUseCase,
    ManageCommitteeUseCase,
    ListCommitteeUseCase,
    ManageQueueUseCase,
    GetDashboardUseCase,
    StudentImportUseCase,
    UploadSignatureUseCase,
    ManageStaffAssignmentsUseCase,
    ListStaffUseCase,
  ],
})
export class AdminModule {}
