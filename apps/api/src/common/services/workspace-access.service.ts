import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class WorkspaceAccessService {
  constructor(private prisma: PrismaService) {}

  /**
   * Vérifie que l'utilisateur est membre d'un workspace.
   * Retourne la membership (utile pour récupérer le role).
   */
  async assertMember(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspace_id: workspaceId,
        user_id: userId,
        deleted: 0,
        active: 1,
      },
      select: { workspace_member_id: true, role: true },
    });

    if (!membership) {
      throw new ForbiddenException("Accès refusé : vous n'êtes pas membre de ce workspace");
    }

    return membership;
  }

  /**
   * Vérifie que l'utilisateur est OWNER du workspace.
   */
  async assertOwner(workspaceId: string, userId: string) {
    const membership = await this.assertMember(workspaceId, userId);

    if (membership.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Action réservée au OWNER du workspace');
    }

    return membership;
  }

  /**
   * Récupère le workspace_id d'un projet (et vérifie que le projet existe).
   */
  async getWorkspaceIdByProjectId(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { project_id: projectId, deleted: 0, active: 1 },
      select: { workspace_id: true },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    return project.workspace_id;
  }

  /**
   * Vérifie qu'un utilisateur (assignee) est membre d'un workspace.
   * Règle métier : on n'assigne pas une tâche à quelqu'un hors workspace.
   */
  async assertAssigneeIsMember(workspaceId: string, assigneeId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspace_id: workspaceId,
        user_id: assigneeId,
        deleted: 0,
        active: 1,
      },
      select: { workspace_member_id: true },
    });

    if (!membership) {
      throw new BadAssigneeException("Assignee invalide : l'utilisateur n'est pas membre du workspace");
    }
  }

  /**
   * Récupère le rôle du user dans le workspace.
   */
  async getRole(workspaceId: string, userId: string): Promise<WorkspaceRole> {
    const mem = await this.prisma.workspaceMember.findFirst({
      where: { workspace_id: workspaceId, user_id: userId, deleted: 0, active: 1 },
      select: { role: true },
    });
    if (!mem) throw new ForbiddenException('Accès workspace refusé');
    return mem.role;
  }

  /**
   * Helper: OWNER ou MANAGER ?
   */
  isPrivileged(role?: WorkspaceRole) {
    return role === WorkspaceRole.OWNER || role === WorkspaceRole.MANAGER;
  }

  /**
   * Assert OWNER/MANAGER
   * (équivalent de assertPrivileged dans le snippet qu'on t'a donné)
   */
  async assertPrivileged(workspaceId: string, userId: string) {
    const role = await this.getRole(workspaceId, userId);
    if (!this.isPrivileged(role)) {
      throw new ForbiddenException('Permissions insuffisantes (OWNER/MANAGER requis)');
    }
  }

  /**
   * Alias que tu utilises déjà côté tasks (garde compat).
   */
  async assertCanManageTasks(workspaceId: string, userId: string) {
    const role = await this.getRole(workspaceId, userId);

    if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.MANAGER) {
      throw new ForbiddenException('Permissions insuffisantes (gestion tâches)');
    }
  }
}

/**
 * Exception dédiée pour mieux distinguer les erreurs d'assignation.
 */
export class BadAssigneeException extends ForbiddenException {
  constructor(message: string) {
    super(message);
  }
}
