import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JobsModule } from './jobs/jobs.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AttachmentsModule } from './attachments/attachments.module';

import { AdminUsersModule } from './admin-users/admin-users.module'; // ✅ AJOUT

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    NotificationsModule,
    AttachmentsModule,

    AdminUsersModule,

    ScheduleModule.forRoot(),
    JobsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
