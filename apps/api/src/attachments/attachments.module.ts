import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceAccessService } from '../common/services/workspace-access.service';
import { TaskEventsModule } from '../task-events/task-events.module';

@Module({
  imports: [PrismaModule, TaskEventsModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, WorkspaceAccessService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
