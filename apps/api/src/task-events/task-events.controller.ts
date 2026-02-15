import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TaskEventsService } from './task-events.service';

@UseGuards(JwtAuthGuard)
@Controller('tasks/:taskId/events')
export class TaskEventsController {
  constructor(private events: TaskEventsService) {}

  @Get()
  list(@Param('taskId') taskId: string) {
    return this.events.list(taskId);
  }
}
