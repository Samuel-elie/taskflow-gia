import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../common/services/workspace-access.service';
import { TaskEventType, TaskPriority, TaskStatus } from '@prisma/client';
import { TaskEventsService } from '../task-events/task-events.service';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private workspaceAccess: WorkspaceAccessService,
    private taskEvents: TaskEventsService,
  ) {}

  /**
   * Crée une tâche dans un projet.
   * OPTION A (comme ton UI):
   * - OWNER/MANAGER uniquement
   * - assignee_id (si fourni) doit être membre du workspace
   */
  async createTask(params: {
    projectId: string;
    dto: {
      title: string;
      description?: string;
      status?: TaskStatus; // sera ignoré côté UI, mais on garde au cas où (on force TODO)
      priority?: TaskPriority;
      deadline?: string;
      assignee_id?: string;
    };
    actor: { sub: string; name: string; email: string };
  }) {
    const { projectId, dto, actor } = params;

    const workspaceId = await this.workspaceAccess.getWorkspaceIdByProjectId(projectId);

    //création réservée OWNER/MANAGER
    await this.workspaceAccess.assertCanManageTasks(workspaceId, actor.sub);

    if (dto.assignee_id) {
      await this.workspaceAccess.assertAssigneeIsMember(workspaceId, dto.assignee_id);
    }

    const deadlineDate = dto.deadline ? new Date(dto.deadline) : undefined;
    if (dto.deadline && Number.isNaN(deadlineDate?.getTime())) {
      throw new BadRequestException('deadline invalide (ISO8601 attendu)');
    }

    const created = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,

        //  on force TODO (ton UI gère le cycle via /ack /close /desist)
        status: TaskStatus.TODO,

        priority: dto.priority ?? TaskPriority.MEDIUM,
        deadline: deadlineDate,

        project_id: projectId,
        assignee_id: dto.assignee_id ?? null,

        creator_id: actor.sub,
        creator_name: actor.name || actor.email,
        active: 1,
        deleted: 0,
      },
      select: {
        task_id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        deadline: true,
        project_id: true,
        assignee_id: true,
        creation_date: true,
      },
    });

    // Event: CREATED
    await this.taskEvents.log({
      taskId: created.task_id,
      type: TaskEventType.CREATED,
      message: `${actor.name || actor.email} a créé la tâche`,
      userId: actor.sub,
    });

    // Event: ASSIGNED (si assignee présent)
    if (created.assignee_id) {
      await this.taskEvents.log({
        taskId: created.task_id,
        type: TaskEventType.ASSIGNED,
        message: `Tâche assignée lors de la création`,
        userId: actor.sub,
      });
    }

    return created;
  }

  /**
   * Liste les tâches d'un projet avec filtres + pagination.
   * OPTION A:
   * - Tout membre du workspace peut lister/voir les tâches
   */
  async listTasksByProject(params: {
    projectId: string;
    query: {
      status?: TaskStatus;
      assigneeId?: string;
      overdue?: 0 | 1;
      page?: number;
      pageSize?: number;
    };
    actorUserId: string;
  }) {
    const { projectId, query, actorUserId } = params;

    const workspaceId = await this.workspaceAccess.getWorkspaceIdByProjectId(projectId);

    //  listing = membre simple suffit (sinon MEMBER ne verra rien)
    await this.workspaceAccess.assertMember(workspaceId, actorUserId);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const now = new Date();

    const where: any = {
      project_id: projectId,
      deleted: 0,
      // active: 1,
    };

    if (query.status) where.status = query.status;
    if (query.assigneeId) where.assignee_id = query.assigneeId;

    if (query.overdue === 1) {
      where.deadline = { lt: now };
      where.status = where.status ?? { not: TaskStatus.DONE };
    }

    const [total, items] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy: [{ status: 'asc' }, { deadline: 'asc' }, { creation_date: 'desc' }],
        skip,
        take: pageSize,
        select: {
          task_id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          deadline: true,
          assignee_id: true,
          creation_date: true,
          last_update_date: true,

          // si tu as DESISTE fields dans le modèle et tu veux les voir côté UI:
          assignee_id_old: true,
          desist_reason: true,
          desist_comment: true,
          desist_date: true,
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items,
    };
  }

  /**
   * Met à jour une tâche (PATCH).
   * OPTION A:
   * - OWNER/MANAGER uniquement
   * - seulement si la tâche est TODO
   * - status ne se modifie pas ici (utiliser /ack /close /desist)
   */
  async updateTask(params: {
    taskId: string;
    dto: {
      title?: string;
      description?: string;
      status?: TaskStatus; // interdit ici
      priority?: TaskPriority;
      deadline?: string;
      assignee_id?: string | null; // interdit ici (utiliser /assign)
    };
    actor: { sub: string; name: string; email: string };
  }) {
    const { taskId, dto, actor } = params;

    const existing = await this.prisma.task.findFirst({
      where: { task_id: taskId, deleted: 0, active: 1 },
      select: {
        task_id: true,
        project_id: true,
        assignee_id: true,
        title: true,
        status: true,
      },
    });
    if (!existing) throw new NotFoundException('Tâche introuvable');

    const workspaceId = await this.workspaceAccess.getWorkspaceIdByProjectId(existing.project_id);

    //  OPTION A: edit réservé OWNER/MANAGER
    await this.workspaceAccess.assertCanManageTasks(workspaceId, actor.sub);

    //  OPTION A: edit seulement TODO
    if (existing.status !== TaskStatus.TODO) {
      throw new ForbiddenException('Modification interdite: seules les tâches TODO sont modifiables');
    }

    //  on interdit le changement de status ici
    if (dto.status !== undefined) {
      throw new BadRequestException(
        'Le status ne se modifie pas ici (utiliser /tasks/:id/ack, /close, /desist)',
      );
    }

    //  on interdit l’assignation via PATCH (on utilise /assign)
    if (dto.assignee_id !== undefined) {
      throw new BadRequestException("L'assignation ne se fait pas ici (utiliser /tasks/:id/assign)");
    }

    let deadlineDate: Date | null | undefined = undefined;
    if (dto.deadline !== undefined) {
      if ((dto.deadline as any) === null) {
        deadlineDate = null;
      } else {
        const d = new Date(dto.deadline);
        if (Number.isNaN(d.getTime())) {
          throw new BadRequestException('deadline invalide (ISO8601 attendu)');
        }
        deadlineDate = d;
      }
    }

    const updated = await this.prisma.task.update({
      where: { task_id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        deadline: deadlineDate,

        updator_id: actor.sub,
        updator_name: actor.name || actor.email,
      },
      select: {
        task_id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        deadline: true,
        assignee_id: true,
        last_update_date: true,
      },
    });

    // Event: UPDATED
    await this.taskEvents.log({
      taskId,
      type: TaskEventType.UPDATED,
      message: `${actor.name || actor.email} a mis à jour la tâche`,
      userId: actor.sub,
    });

    return updated;
  }

  /**
   * Soft delete d'une tâche.
   * OPTION A:
   * - OWNER/MANAGER uniquement
   * - seulement si TODO
   */
  async deleteTask(params: {
    taskId: string;
    actor: { sub: string; name: string; email: string };
  }) {
    const { taskId, actor } = params;

    const task = await this.prisma.task.findFirst({
      where: { task_id: taskId, deleted: 0, active: 1 },
      select: { task_id: true, project_id: true, title: true, status: true },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const workspaceId = await this.workspaceAccess.getWorkspaceIdByProjectId(task.project_id);

    //  OPTION A: delete réservé OWNER/MANAGER
    await this.workspaceAccess.assertCanManageTasks(workspaceId, actor.sub);

    //  OPTION A: delete seulement TODO
    if (task.status !== TaskStatus.TODO) {
      throw new ForbiddenException('Suppression interdite: seules les tâches TODO sont supprimables');
    }

    await this.prisma.task.update({
      where: { task_id: taskId },
      data: {
        deleted: 1,
        active: 0,
        deleted_date: new Date(),
        deletor_id: actor.sub,
        deletor_name: actor.name || actor.email,
      },
    });

    await this.taskEvents.log({
      taskId,
      type: TaskEventType.UPDATED,
      message: `${actor.name || actor.email} a supprimé la tâche (soft delete)`,
      userId: actor.sub,
    });

    return { ok: true };
  }

  /**
   * Assigne / désassigne une tâche.
   * OPTION A:
   * - OWNER/MANAGER uniquement
   * - seulement si TODO
   */
  async assignTask(params: {
    taskId: string;
    assignee_id?: string | null;
    actor: { sub: string; name: string; email: string };
  }) {
    const { taskId, assignee_id, actor } = params;

    const task = await this.prisma.task.findFirst({
      where: { task_id: taskId, deleted: 0, active: 1 },
      select: { task_id: true, title: true, project_id: true, assignee_id: true, status: true },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const workspaceId = await this.workspaceAccess.getWorkspaceIdByProjectId(task.project_id);

    //  OPTION A: assign réservé OWNER/MANAGER
    await this.workspaceAccess.assertCanManageTasks(workspaceId, actor.sub);

    //  OPTION A: assign seulement TODO
    if (task.status !== TaskStatus.TODO) {
      throw new ForbiddenException("Assignation interdite: la tâche doit être en TODO");
    }

    if (assignee_id && typeof assignee_id === 'string') {
      await this.workspaceAccess.assertAssigneeIsMember(workspaceId, assignee_id);
    }

    const beforeAssignee = task.assignee_id ?? null;
    const nextAssignee =
      assignee_id === undefined ? (task.assignee_id ?? null) : (assignee_id ?? null);

    const updated = await this.prisma.task.update({
      where: { task_id: taskId },
      data: {
        assignee_id: assignee_id === undefined ? task.assignee_id : assignee_id,

        updator_id: actor.sub,
        updator_name: actor.name || actor.email,
      },
      select: {
        task_id: true,
        title: true,
        assignee_id: true,
        last_update_date: true,
      },
    });

    // Event: ASSIGNED / REASSIGNED / UPDATED (désassign)
    if (beforeAssignee !== nextAssignee) {
      const type: TaskEventType =
        beforeAssignee && nextAssignee
          ? TaskEventType.REASSIGNED
          : nextAssignee
            ? TaskEventType.ASSIGNED
            : TaskEventType.UPDATED;

      const msg =
        type === TaskEventType.REASSIGNED
          ? `Tâche réassignée`
          : type === TaskEventType.ASSIGNED
            ? `Tâche assignée`
            : `Assignation retirée`;

      await this.taskEvents.log({
        taskId,
        type,
        message: msg,
        userId: actor.sub,
      });
    }

    // Notification au nouvel assignee
    if (updated.assignee_id && typeof updated.assignee_id === 'string') {
      await this.prisma.notification.create({
        data: {
          type: 'TASK_ASSIGNED',
          message: `Vous avez été assigné à la tâche: "${updated.title}"`,
          read: 0,
          user_id: updated.assignee_id,

          creator_id: actor.sub,
          creator_name: actor.name || actor.email,
          active: 1,
          deleted: 0,
        },
      });
    }

    return updated;
  }

  /**
   * Liste mes tâches + retourne des counts UX-friendly.
   * (assignee-only, donc OK pour MEMBER)
   */
  async listMyTasks(params: {
    actorUserId: string;
    query: {
      status?: TaskStatus;
      overdue?: 0 | 1;
      page?: number;
      pageSize?: number;
      sort?: 'deadline' | 'creation_date';
      order?: 'asc' | 'desc';
    };
  }) {
    const { actorUserId, query } = params;

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const baseWhere: any = {
      assignee_id: actorUserId,
      deleted: 0,
      // active: 1,
    };

    const listWhere: any = { ...baseWhere };

    if (query.status) listWhere.status = query.status;

    if (query.overdue === 1) {
      listWhere.deadline = { lt: now };
      if (!query.status) listWhere.status = { not: TaskStatus.DONE };
    }

    const sortField = query.sort ?? 'deadline';
    const sortOrder = query.order ?? 'asc';
    const orderBy: any[] = [{ [sortField]: sortOrder }, { creation_date: 'desc' }];

    const [total, tasks, byStatusGroup, overdueCount, dueSoonCount] = await Promise.all([
      this.prisma.task.count({ where: listWhere }),
      this.prisma.task.findMany({
        where: listWhere,
        skip,
        take: pageSize,
        orderBy,
        select: {
          task_id: true,
          title: true,
          status: true,
          priority: true,
          deadline: true,
          creation_date: true,
          last_update_date: true,
          project: {
            select: {
              project_id: true,
              name: true,
              workspace_id: true,
            },
          },
        },
      }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { status: true },
      }),
      this.prisma.task.count({
        where: {
          ...baseWhere,
          deadline: { lt: now },
          status: { not: TaskStatus.DONE },
        },
      }),
      this.prisma.task.count({
        where: {
          ...baseWhere,
          deadline: { gte: now, lte: next24h },
          status: { not: TaskStatus.DONE },
        },
      }),
    ]);

    const byStatus: Record<TaskStatus, number> = {
      TODO: 0,
      DOING: 0,
      DONE: 0,
      DESISTE: 0,
    };

    for (const row of byStatusGroup as any[]) {
      byStatus[row.status] = row._count.status;
    }

    return {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      tasks,
      counts: {
        overdue: overdueCount,
        dueSoon: dueSoonCount,
        byStatus,
      },
    };
  }

  /**
   * Récupère la tâche + vérifie accès workspace (membre suffit).
   * Retourne task + workspaceId.
   */
  private async getTaskWithWorkspaceOrThrow(taskId: string, actorUserId: string) {
    const task = await this.prisma.task.findFirst({
      where: { task_id: taskId, deleted: 0, active: 1 },
      select: {
        task_id: true,
        title: true,
        status: true,
        project_id: true,
        assignee_id: true,
        deadline: true,
      },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const workspaceId = await this.workspaceAccess.getWorkspaceIdByProjectId(task.project_id);
    await this.workspaceAccess.assertMember(workspaceId, actorUserId);

    return { task, workspaceId };
  }

  /**
   * Accuser réception: TODO -> DOING (assignee uniquement)
   */
  async acknowledgeTask(params: {
    taskId: string;
    actor: { sub: string; name: string; email: string };
  }) {
    const { taskId, actor } = params;

    const { task } = await this.getTaskWithWorkspaceOrThrow(taskId, actor.sub);

    if (!task.assignee_id) throw new BadRequestException("La tâche n'est pas assignée");
    if (task.assignee_id !== actor.sub) throw new ForbiddenException("Vous n'êtes pas l'assigné");
    if (task.status !== TaskStatus.TODO) {
      throw new BadRequestException('Action invalide: la tâche doit être en TODO');
    }

    const updated = await this.prisma.task.update({
      where: { task_id: taskId },
      data: {
        status: TaskStatus.DOING,
        updator_id: actor.sub,
        updator_name: actor.name || actor.email,
      },
      select: {
        task_id: true,
        title: true,
        status: true,
        assignee_id: true,
        last_update_date: true,
      },
    });

    await this.taskEvents.log({
      taskId,
      type: TaskEventType.ACKNOWLEDGED,
      message: `${actor.name || actor.email} a pris en charge la tâche`,
      userId: actor.sub,
    });

    return updated;
  }

  /**
   * Clôturer: DOING -> DONE (assignee uniquement)
   */
  async closeTask(params: {
    taskId: string;
    actor: { sub: string; name: string; email: string };
  }) {
    const { taskId, actor } = params;

    const { task } = await this.getTaskWithWorkspaceOrThrow(taskId, actor.sub);

    if (!task.assignee_id) throw new BadRequestException("La tâche n'est pas assignée");
    if (task.assignee_id !== actor.sub) throw new ForbiddenException("Vous n'êtes pas l'assigné");
    if (task.status !== TaskStatus.DOING) {
      throw new BadRequestException('Action invalide: la tâche doit être en DOING');
    }

    const updated = await this.prisma.task.update({
      where: { task_id: taskId },
      data: {
        status: TaskStatus.DONE,
        updator_id: actor.sub,
        updator_name: actor.name || actor.email,
      },
      select: {
        task_id: true,
        title: true,
        status: true,
        assignee_id: true,
        last_update_date: true,
      },
    });

    await this.taskEvents.log({
      taskId,
      type: TaskEventType.CLOSED,
      message: `${actor.name || actor.email} a clôturé la tâche`,
      userId: actor.sub,
    });

    return updated;
  }

  /**
   * Désistement: TODO/DOING -> DESISTE (assignee uniquement)
   */
  async desistTask(params: {
    taskId: string;
    dto: { reason: string; comment: string };
    actor: { sub: string; name: string; email: string };
  }) {
    const { taskId, dto, actor } = params;

    const { task } = await this.getTaskWithWorkspaceOrThrow(taskId, actor.sub);

    if (!task.assignee_id) throw new BadRequestException("La tâche n'est pas assignée");
    if (task.assignee_id !== actor.sub) throw new ForbiddenException("Vous n'êtes pas l'assigné");

    if (task.status !== TaskStatus.TODO && task.status !== TaskStatus.DOING) {
      throw new BadRequestException('Action invalide: la tâche doit être en TODO ou DOING');
    }

    if (!dto?.reason?.trim() || !dto?.comment?.trim()) {
      throw new BadRequestException('Motif et commentaire sont obligatoires');
    }

    const updated = await this.prisma.task.update({
      where: { task_id: taskId },
      data: {
        status: TaskStatus.DESISTE,

        assignee_id_old: task.assignee_id,
        desistor_id: actor.sub,
        desist_reason: dto.reason.trim(),
        desist_comment: dto.comment.trim(),
        desist_date: new Date(),

        assignee_id: null,

        updator_id: actor.sub,
        updator_name: actor.name || actor.email,
      },
      select: {
        task_id: true,
        title: true,
        status: true,
        assignee_id: true,
        assignee_id_old: true,
        desist_reason: true,
        desist_comment: true,
        desist_date: true,
        last_update_date: true,
      },
    });

    await this.taskEvents.log({
      taskId,
      type: TaskEventType.DESISTED,
      message: `${actor.name || actor.email} s’est désisté : ${dto.reason.trim()}`,
      userId: actor.sub,
    });

    const proj = await this.prisma.project.findFirst({
      where: { project_id: task.project_id, deleted: 0, active: 1 },
      select: { owner_id: true },
    });

    if (proj?.owner_id) {
      await this.prisma.notification.create({
        data: {
          type: 'TASK_DESISTED',
          message: `Désistement sur la tâche "${task.title}" : ${dto.reason.trim()}`,
          read: 0,
          user_id: proj.owner_id,
          creator_id: actor.sub,
          creator_name: actor.name || actor.email,
          active: 1,
          deleted: 0,
        },
      });
    }

    return updated;
  }

  /**
   * Réassigner: DESISTE -> TODO (OWNER/MANAGER uniquement)
   */
  async reassignTask(params: {
    taskId: string;
    dto: { assignee_id: string };
    actor: { sub: string; name: string; email: string };
  }) {
    const { taskId, dto, actor } = params;

    const { task, workspaceId } = await this.getTaskWithWorkspaceOrThrow(taskId, actor.sub);

    await this.workspaceAccess.assertCanManageTasks(workspaceId, actor.sub);

    if (task.status !== TaskStatus.DESISTE) {
      throw new BadRequestException('Action invalide: la tâche doit être en DESISTE');
    }
    if (!dto?.assignee_id?.trim()) {
      throw new BadRequestException('assignee_id requis');
    }

    await this.workspaceAccess.assertAssigneeIsMember(workspaceId, dto.assignee_id);

    let deadlineWarning: any = null;

    if (task.deadline) {
      const from = new Date(task.deadline.getTime() - 12 * 60 * 60 * 1000);
      const to = new Date(task.deadline.getTime() + 12 * 60 * 60 * 1000);

      const conflicts = await this.prisma.task.findMany({
        where: {
          assignee_id: dto.assignee_id,
          deleted: 0,
          active: 1,
          status: { not: TaskStatus.DONE },
          deadline: { gte: from, lte: to },
        },
        select: {
          task_id: true,
          title: true,
          status: true,
          deadline: true,
          project: { select: { project_id: true, name: true } },
        },
        take: 10,
        orderBy: { deadline: 'asc' },
      });

      if (conflicts.length > 0) {
        deadlineWarning = {
          windowHours: 24,
          conflictsCount: conflicts.length,
          conflicts,
        };
      }
    }

    const updated = await this.prisma.task.update({
      where: { task_id: taskId },
      data: {
        assignee_id: dto.assignee_id,
        status: TaskStatus.TODO,

        updator_id: actor.sub,
        updator_name: actor.name || actor.email,
      },
      select: {
        task_id: true,
        title: true,
        status: true,
        assignee_id: true,
        assignee_id_old: true,
        last_update_date: true,
      },
    });

    await this.taskEvents.log({
      taskId,
      type: TaskEventType.REASSIGNED,
      message: `${actor.name || actor.email} a réassigné la tâche`,
      userId: actor.sub,
    });

    await this.prisma.notification.create({
      data: {
        type: 'TASK_REASSIGNED',
        message: `Vous avez été assigné à la tâche "${updated.title}"`,
        read: 0,
        user_id: dto.assignee_id,
        creator_id: actor.sub,
        creator_name: actor.name || actor.email,
        active: 1,
        deleted: 0,
      },
    });

    return {
      task: updated,
      warning: deadlineWarning,
    };
  }

  async getTaskById(params: { taskId: string; actorUserId: string }) {
    const { taskId, actorUserId } = params;

    const task = await this.prisma.task.findFirst({
      where: {
        task_id: taskId,
        deleted: 0,
        active: 1,
      },
      include: {
        project: {
          select: {
            project_id: true,
            workspace_id: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Tâche introuvable');
    }

    await this.workspaceAccess.assertMember(task.project.workspace_id, actorUserId);

    return task;
  }
}
