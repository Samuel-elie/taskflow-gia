import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskEventsService } from './task-events.service';
import { TaskEventsController } from './task-events.controller';

@Module({
  controllers: [TaskEventsController],
  providers: [TaskEventsService, PrismaService],
  exports: [TaskEventsService],
})
export class TaskEventsModule {}
