import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../common/services/workspace-access.service';
import { extractMentionUserIds } from './mentions.util';
import { TaskEventsService } from '../task-events/task-events.service';
import { TaskEventType } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private workspaceAccess: WorkspaceAccessService,
    private taskEvents: TaskEventsService,
  ) {}

  /**
   * Crée un commentaire sur une tâche + mentions
   */
  async createComment(params: {
    taskId: string;
    content: string;
    actor: { sub: string; name?: string; email?: string };
  }) {
    const { taskId, content, actor } = params;

    const clean = (content ?? '').trim();
    if (clean.length < 2) {
      // tu peux throw BadRequest si tu veux, mais je garde simple
      throw new Error('Contenu du commentaire invalide');
    }

    // 1) Charger la tâche (pour project_id + title)
    const task = await this.prisma.task.findFirst({
      where: { task_id: taskId, deleted: 0, active: 1 },
      select: { project_id: true, title: true },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');

    // 2) Vérifier accès workspace via projet
    const workspaceId = await this.workspaceAccess.getWorkspaceIdByProjectId(task.project_id);
    await this.workspaceAccess.assertMember(workspaceId, actor.sub);

    // 3) Extract mentions ids
    const mentionIdsRaw = extractMentionUserIds(clean);

    // 4) Sécuriser: ne garder que les users qui sont membres du workspace (évite mention hors projet / FK)
    let mentionIds: string[] = [];
    if (mentionIdsRaw.length) {
      const members = await this.prisma.workspaceMember.findMany({
        where: {
          workspace_id: workspaceId,
          user_id: { in: mentionIdsRaw },
          deleted: 0,
          active: 1,
        },
        select: { user_id: true },
      });

      const allowed = new Set(members.map((m) => m.user_id));
      mentionIds = mentionIdsRaw.filter((id) => allowed.has(id));
    }

    // 5) Créer le commentaire + mentions (nested write)
    const created = await this.prisma.comment.create({
      data: {
        content: clean,
        task_id: taskId,
        user_id: actor.sub,

        creator_id: actor.sub,
        creator_name: actor.name || actor.email || '—',
        active: 1,
        deleted: 0,

        mentions: mentionIds.length
          ? {
              create: mentionIds.map((uid) => ({
                mentioned_user_id: uid,
              })),
            }
          : undefined,
      },
      select: {
        comment_id: true,
        content: true,
        task_id: true,
        user_id: true,
        creator_name: true,
        creation_date: true,
        mentions: {
          select: { mentioned_user_id: true },
        },
      },
    });

    // 6) Notifications pour les mentions (MVP)
    const notifyIds = mentionIds.filter((uid) => uid !== actor.sub);
    if (notifyIds.length) {
      await this.prisma.notification.createMany({
        data: notifyIds.map((uid) => ({
          user_id: uid,
          type: 'MENTION',
          message: `${actor.name || actor.email} vous a mentionné sur : ${task.title}`,
          read: 0,
          active: 1,
          deleted: 0,
          creator_id: actor.sub,
          creator_name: actor.name || actor.email,
        })),
      });
    }

    // 7) Timeline event
    await this.taskEvents.log({
      taskId,
      type: TaskEventType.COMMENTED,
      message: `${actor.name || actor.email} a ajouté un commentaire`,
      userId: actor.sub,
    });

    return created;
  }

  /**
   * Liste les commentaires d'une tâche (ASC)
   */
  async listComments(params: { taskId: string; actorUserId: string }) {
    const { taskId, actorUserId } = params;

    const task = await this.prisma.task.findFirst({
      where: { task_id: taskId, deleted: 0, active: 1 },
      select: { project_id: true },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const workspaceId = await this.workspaceAccess.getWorkspaceIdByProjectId(task.project_id);
    await this.workspaceAccess.assertMember(workspaceId, actorUserId);

    return this.prisma.comment.findMany({
      where: { task_id: taskId, deleted: 0, active: 1 },
      orderBy: { creation_date: 'asc' },
      select: {
        comment_id: true,
        content: true,
        user_id: true,
        creator_name: true,
        creation_date: true,
        mentions: { select: { mentioned_user_id: true } },
      },
    });
  }
}
