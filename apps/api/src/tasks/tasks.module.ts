import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskEventsModule } from '../task-events/task-events.module';


/**
 * Module Tasks :
 * - Importe CommonModule pour vérifier les accès workspace.
 */
@Module({
  imports: [CommonModule, TaskEventsModule],
  controllers: [TasksController],
  providers: [TasksService, PrismaService],
  exports: [TasksService],
})
export class TasksModule {}
