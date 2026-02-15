import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retourne le dashboard agrégé pour l'utilisateur connecté.
   * - Workspaces accessibles (membership) + projets
   * - Counts tâches assignées (global)
   * - Unread notifications count
   * - myTasksPreview : 5 tâches assignées les plus urgentes, enrichies UX
   */
  async getDashboard(params: { actorUserId: string }) {
    const { actorUserId } = params;

    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const baseTaskWhere: any = {
      assignee_id: actorUserId,
      deleted: 0,
      active: 1,
    };

    const [
      workspaces,
      tasksByStatusGroup,
      overdueCount,
      dueSoonCount,
      unreadNotificationsCount,
      myTasksPreview, // 5 tâches les plus urgentes
    ] = await Promise.all([
      // Workspaces + projets
      this.prisma.workspace.findMany({
        where: {
          deleted: 0,
          active: 1,
          members: { some: { user_id: actorUserId, deleted: 0, active: 1 } },
        },
        orderBy: { creation_date: 'desc' },
        select: {
          workspace_id: true,
          name: true,
          creation_date: true,
          members: {
            where: { user_id: actorUserId, deleted: 0, active: 1 },
            select: { role: true },
          },
          projects: {
            where: { deleted: 0, active: 1 },
            orderBy: { creation_date: 'desc' },
            select: {
              project_id: true,
              name: true,
              description: true,
              owner_id: true,
              creation_date: true,
            },
          },
        },
      }),

      // Counts par status
      this.prisma.task.groupBy({
        by: ['status'],
        where: baseTaskWhere,
        _count: { status: true },
      }),

      // Overdue
      this.prisma.task.count({
        where: { ...baseTaskWhere, deadline: { lt: now }, status: { not: TaskStatus.DONE } },
      }),

      // Due soon (24h)
      this.prisma.task.count({
        where: { ...baseTaskWhere, deadline: { gte: now, lte: next24h }, status: { not: TaskStatus.DONE } },
      }),

      // Notifications non lues
      this.prisma.notification.count({
        where: { user_id: actorUserId, read: 0, deleted: 0, active: 1 },
      }),

      // Preview des 5 tâches les plus urgentes
      this.prisma.task.findMany({
        where: {
          ...baseTaskWhere,
          status: { not: TaskStatus.DONE },
          deadline: { not: null },
        },
        orderBy: [{ deadline: 'asc' }, { creation_date: 'desc' }],
        take: 5,
        select: {
          task_id: true,
          title: true,
          deadline: true,
          status: true,
          priority: true,
          project_id: true,
          project: { select: { project_id: true, name: true } },
          assignee: { select: { user_id: true, name: true, email: true } },
        },
      }),
    ]);

    // Normaliser byStatus
    //const byStatus: Record<TaskStatus, number> = { TODO: 0, DOING: 0, DONE: 0 };
    const byStatus: Record<TaskStatus, number> = { TODO: 0, DOING: 0, DONE: 0, DESISTE: 0 };
    for (const row of tasksByStatusGroup) byStatus[row.status] = row._count.status;

    // Normaliser workspaces
    const normalizedWorkspaces = workspaces.map((ws) => ({
      workspace_id: ws.workspace_id,
      name: ws.name,
      creation_date: ws.creation_date,
      myRole: ws.members?.[0]?.role ?? null,
      projects: ws.projects,
    }));

    /**
     *  Post-processing UX sur myTasksPreview
     * - isOverdue: boolean
     * - dueInHours: number | null
     */
    const enrichedPreview = myTasksPreview.map((task) => {
      if (!task.deadline) {
        return { ...task, isOverdue: false, dueInHours: null };
      }

      const diffMs = task.deadline.getTime() - now.getTime();
      const diffHours = diffMs / 3600000;

      return {
        ...task,
        isOverdue: diffMs < 0,
        dueInHours: Math.round(diffHours),
      };
    });

    return {
      workspaces: normalizedWorkspaces,
      counts: { overdue: overdueCount, dueSoon: dueSoonCount, byStatus },
      notifications: { unreadCount: unreadNotificationsCount },
      myTasksPreview: enrichedPreview,
    };
  }
}
