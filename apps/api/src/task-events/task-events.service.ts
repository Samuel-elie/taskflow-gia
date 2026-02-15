import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskEventType } from '@prisma/client';

@Injectable()
export class TaskEventsService {
  constructor(private prisma: PrismaService) {}

  async log(params: { taskId: string; type: TaskEventType; message: string; userId: string }) {
    const { taskId, type, message, userId } = params;

    return this.prisma.taskEvent.create({
      data: {
        task_id: taskId,
        type,
        message,
        user_id: userId,
      },
    });
  }

  async list(taskId: string) {
    return this.prisma.taskEvent.findMany({
      where: { task_id: taskId },
      orderBy: { creation_date: 'desc' },
      select: {
        task_event_id: true,
        type: true,
        message: true,
        creation_date: true,
        user: {
          select: { user_id: true, name: true, email: true },
        },
      },
    });
  }
}
