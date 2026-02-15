import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../common/services/workspace-access.service';
import { TaskEventsService } from '../task-events/task-events.service';
import { TaskEventType } from '@prisma/client';

// (optionnel si tu veux supprimer le fichier sur disque)
// import { join } from 'path';
// import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class AttachmentsService {
  constructor(
    private prisma: PrismaService,
    private workspaceAccess: WorkspaceAccessService,
    private taskEvents: TaskEventsService,
  ) {}

  private async assertTaskAccess(taskId: string, actorUserId: string) {
    const task = await this.prisma.task.findFirst({
      where: { task_id: taskId, deleted: 0, active: 1 },
      select: { task_id: true, title: true, project_id: true },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const workspaceId = await this.workspaceAccess.getWorkspaceIdByProjectId(task.project_id);
    await this.workspaceAccess.assertMember(workspaceId, actorUserId);

    return task;
  }

  async create(params: {
    taskId: string;
    file: Express.Multer.File;
    actor: { sub: string; name?: string; email?: string };
  }) {
    const { taskId, file, actor } = params;

    const task = await this.assertTaskAccess(taskId, actor.sub);

    const url = `/uploads/${file.filename}`; // local

    const created = await this.prisma.attachment.create({
      data: {
        task_id: taskId,
        uploader_id: actor.sub,
        file_name: file.originalname,
        content_type: file.mimetype,
        file_size: file.size,
        url,
        storage_key: file.filename,
        active: 1,
        deleted: 0,
      },
      select: {
        attachment_id: true,
        task_id: true,
        file_name: true,
        content_type: true,
        file_size: true,
        url: true,
        creation_date: true,
        uploader: { select: { user_id: true, name: true, email: true } },
      },
    });

    // Timeline
    await this.taskEvents.log({
      taskId,
      type: TaskEventType.UPDATED,
      message: `${actor.name || actor.email} a ajouté un fichier : ${file.originalname}`,
      userId: actor.sub,
    });

    return created;
  }

  async list(params: { taskId: string; actorUserId: string }) {
    const { taskId, actorUserId } = params;

    await this.assertTaskAccess(taskId, actorUserId);

    return this.prisma.attachment.findMany({
      where: { task_id: taskId, deleted: 0, active: 1 },
      orderBy: { creation_date: 'desc' },
      select: {
        attachment_id: true,
        file_name: true,
        content_type: true,
        file_size: true,
        url: true,
        creation_date: true,
        uploader: { select: { user_id: true, name: true, email: true } },
      },
    });
  }

  async remove(params: {
    attachmentId: string;
    actor: { sub: string; name?: string; email?: string };
  }) {
    const { attachmentId, actor } = params;

    const att = await this.prisma.attachment.findFirst({
      where: { attachment_id: attachmentId, deleted: 0, active: 1 },
      select: {
        attachment_id: true,
        task_id: true,
        uploader_id: true,
        file_name: true,
        storage_key: true,
      },
    });
    if (!att) throw new NotFoundException('Pièce jointe introuvable');

    // accès workspace
    await this.assertTaskAccess(att.task_id, actor.sub);

    // règle simple MVP : seul uploader supprime
    if (att.uploader_id !== actor.sub) {
      throw new ForbiddenException("Seul l'uploader peut supprimer ce fichier.");
    }

    await this.prisma.attachment.update({
      where: { attachment_id: attachmentId },
      data: { deleted: 1, active: 0 },
    });

    // (optionnel) supprimer le fichier physique sur disque
    // if (att.storage_key) {
    //   const path = join(process.cwd(), 'uploads', att.storage_key);
    //   if (existsSync(path)) unlinkSync(path);
    // }

    await this.taskEvents.log({
      taskId: att.task_id,
      type: TaskEventType.UPDATED,
      message: `${actor.name || actor.email} a supprimé un fichier : ${att.file_name}`,
      userId: actor.sub,
    });

    return { ok: true };
  }
}
