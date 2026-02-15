import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InviteStatus, WorkspaceRole } from '@prisma/client';



@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée un workspace et inscrit automatiquement le créateur en OWNER.
   * Choix:
   * - Transaction Prisma : plus sûr (workspace + membership atomiques).
   * - 2 requêtes séparées : plus simple, mais risque d'incohérence si crash.
   * Choix retenu : transaction.
   */
  async createWorkspace(params: { name: string; creator: { sub: string; name: string; email: string } }) {
    const { name, creator } = params;

    const result = await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          creator_id: creator.sub,
          creator_name: creator.name || creator.email,
          active: 1,
          deleted: 0,
        },
        select: { workspace_id: true, name: true, creation_date: true },
      });

      await tx.workspaceMember.create({
        data: {
          workspace_id: workspace.workspace_id,
          user_id: creator.sub,
          role: WorkspaceRole.OWNER,
          creator_id: creator.sub,
          creator_name: creator.name || creator.email,
          active: 1,
          deleted: 0,
        },
      });

      return workspace;
    });

    return result;
  }

    /**
   * Liste les workspaces dont l'utilisateur est membre.
   * Objectif MVP : afficher TOUS les workspaces non supprimés (active 0 ou 1).
   *
   * Choix :
   * - Filtrer active=1 => cache les workspaces désactivés (pas souhaité).
   * - Filtrer deleted=0 uniquement => correct : seul "supprimé" disparaît.
   * Choix retenu : deleted=0 uniquement.
   */
async listMyWorkspaces(userId: string) {
  const workspaces = await this.prisma.workspace.findMany({
    where: {
      deleted: 0,
      members: {
        some: {
          user_id: userId,
          deleted: 0,
          active: 1,
        },
      },
    },
    select: {
      workspace_id: true,
      name: true,
      creation_date: true,
      active: true,
      members: {
        where: {
          user_id: userId,
          deleted: 0,
          active: 1,
        },
        select: {
          role: true,
        },
      },
    },
    orderBy: { creation_date: 'desc' },
  });

  return workspaces.map((w) => ({
    workspace_id: w.workspace_id,
    name: w.name,
    creation_date: w.creation_date,
    active: w.active,
    role: w.members[0]?.role ?? 'MEMBER',
  }));
}



  /**
   * Ajoute un membre à un workspace (OWNER uniquement).
   * Ici on ajoute par email pour simplifier le MVP.
   */
  async addMember(params: { workspaceId: string; email: string; role: WorkspaceRole; actor: { sub: string; name: string; email: string } }) {
    const { workspaceId, email, role, actor } = params;

    // Vérifie que l'acteur est OWNER du workspace
    const actorMembership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspace_id: workspaceId,
        user_id: actor.sub,
        deleted: 0,
        active: 1,
      },
      select: { role: true },
    });

    if (!actorMembership) throw new ForbiddenException('Accès refusé au workspace');
    if (actorMembership.role !== WorkspaceRole.OWNER) throw new ForbiddenException('Seul un OWNER peut ajouter des membres');

    // Vérifie l'existence du workspace
    const ws = await this.prisma.workspace.findFirst({
      where: { workspace_id: workspaceId, deleted: 0 },
      select: { workspace_id: true },
    });
    if (!ws) throw new NotFoundException('Workspace introuvable');

    // Cherche l'utilisateur
    const user = await this.prisma.user.findFirst({
      where: { email, deleted: 0, active: 1 },
      select: { user_id: true, email: true, name: true },
    });
    if (!user) throw new NotFoundException("Utilisateur introuvable (email)");

    // Crée membership (avec gestion "déjà membre")
    try {
      return await this.prisma.workspaceMember.create({
        data: {
          workspace_id: workspaceId,
          user_id: user.user_id,
          role,
          creator_id: actor.sub,
          creator_name: actor.name || actor.email,
          active: 1,
          deleted: 0,
        },
        select: {
          workspace_member_id: true,
          workspace_id: true,
          user_id: true,
          role: true,
        },
      });
    } catch {
      throw new BadRequestException("Cet utilisateur est déjà membre du workspace");
    }
  }

  /**
   * Liste les membres d'un workspace.
   * Règle:
   * - l'utilisateur doit être membre du workspace pour voir la liste.
   */
  async listMembers(params: { workspaceId: string; actorUserId: string }) {
    const { workspaceId, actorUserId } = params;

    // 1) Vérifier workspace existe
    const ws = await this.prisma.workspace.findFirst({
      where: { workspace_id: workspaceId, deleted: 0 },
      select: { workspace_id: true },
    });
    if (!ws) throw new NotFoundException('Workspace introuvable');

    // 2) Vérifier que l'acteur est membre (sécurité)
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspace_id: workspaceId,
        user_id: actorUserId,
        deleted: 0,
        active: 1,
      },
      select: { workspace_member_id: true },
    });
    if (!membership) {
      // On utilise NotFound ou Forbidden ? Ici Forbidden est plus correct.
      // Mais on garde une réponse simple: accès refusé.
      // (Si tu veux, on peut harmoniser toutes les erreurs avec ForbiddenException.)
      throw new NotFoundException('Workspace introuvable ou accès refusé');
    }

    // 3) Retourner la liste des membres (minimal + utile)
    return this.prisma.workspaceMember.findMany({
      where: { workspace_id: workspaceId, deleted: 0, active: 1 },
      orderBy: { creation_date: 'asc' },
      select: {
        workspace_member_id: true,
        role: true,
        creation_date: true,
        user: {
          select: {
            user_id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

    /**
   * Liste les utilisateurs d'un workspace (utile pour UI assignation).
   * Règle: l'acteur doit être membre du workspace.
   */
  async listWorkspaceUsers(params: { workspaceId: string; actorUserId: string }) {
    const { workspaceId, actorUserId } = params;

    // Vérifier workspace existe
    const ws = await this.prisma.workspace.findFirst({
      where: { workspace_id: workspaceId, deleted: 0, active: 1 },
      select: { workspace_id: true },
    });
    if (!ws) throw new NotFoundException('Workspace introuvable');

    // Vérifier accès (membership)
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspace_id: workspaceId, user_id: actorUserId, deleted: 0, active: 1 },
      select: { workspace_member_id: true },
    });
    if (!membership) throw new NotFoundException('Workspace introuvable ou accès refusé');

    // Retourner users
    return this.prisma.workspaceMember.findMany({
      where: { workspace_id: workspaceId, deleted: 0, active: 1 },
      orderBy: { creation_date: 'asc' },
      select: {
        role: true,
        user: {
          select: {
            user_id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Helper : vérifie que actor est OWNER du workspace.
   * Choix : centraliser la règle pour éviter de la répéter.
   */
  private async assertOwner(workspaceId: string, actorUserId: string) {
    //  adapte "workspaceMember" + champ role selon ton schema
    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspace_id: workspaceId,
        user_id: actorUserId,
        role: 'OWNER',
        deleted: 0,
        active: 1,
      },
    });

    if (!member) throw new ForbiddenException('OWNER only');
  }

  /**
   * Update workspace (rename / active).
   * MVP : OWNER only.
   */
  async updateWorkspaceOwnerOnly(params: {
    workspaceId: string;
    dto: { name?: string; active?: number };
    actor: any;
  }) {
    await this.assertOwner(params.workspaceId, params.actor.sub);

    const ws = await this.prisma.workspace.findFirst({
      where: { workspace_id: params.workspaceId, deleted: 0 },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

    return this.prisma.workspace.update({
      where: { workspace_id: params.workspaceId },
      data: {
        ...(params.dto.name !== undefined ? { name: params.dto.name } : {}),
        ...(params.dto.active !== undefined ? { active: params.dto.active } : {}),

        updator_id: params.actor.sub,
        updator_name: params.actor.name ?? params.actor.email ?? '',
      },
      select: { workspace_id: true, name: true, active: true },
    });
  }

  /**
   * Soft delete workspace.
   * MVP : OWNER only.
   */
  async softDeleteWorkspaceOwnerOnly(params: { workspaceId: string; actor: any }) {
    await this.assertOwner(params.workspaceId, params.actor.sub);

    const ws = await this.prisma.workspace.findFirst({
      where: { workspace_id: params.workspaceId, deleted: 0 },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

    await this.prisma.workspace.update({
      where: { workspace_id: params.workspaceId },
      data: {
        deleted: 1,
        deletor_id: params.actor.sub,
        deletor_name: params.actor.name ?? params.actor.email ?? '',
        deleted_date: new Date(),
      },
    });

    return { ok: true };
  }

  /**
   * Toggle active 0/1.
   * MVP : OWNER only.
   */
  async toggleActiveOwnerOnly(params: { workspaceId: string; actor: any }) {
    await this.assertOwner(params.workspaceId, params.actor.sub);

    const ws = await this.prisma.workspace.findFirst({
      where: { workspace_id: params.workspaceId, deleted: 0 },
      select: { active: true },
    });
    if (!ws) throw new NotFoundException('Workspace not found');

    const next = ws.active === 1 ? 0 : 1;

    return this.prisma.workspace.update({
      where: { workspace_id: params.workspaceId },
      data: {
        active: next,
        updator_id: params.actor.sub,
        updator_name: params.actor.name ?? params.actor.email ?? '',
      },
      select: { workspace_id: true, name: true, active: true },
    });
  }

  async me(params: { workspaceId: string; actorUserId: string }) {
    const { workspaceId, actorUserId } = params;

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspace_id: workspaceId, user_id: actorUserId, deleted: 0, active: 1 },
      select: { role: true },
    });

    if (!membership) {
      // Nest standard : 403 si pas membre
      throw new ForbiddenException("Accès refusé : vous n'êtes pas membre de ce workspace");
    }

    return { role: membership.role as WorkspaceRole };
  }

async acceptInvite(params: { inviteId: string; userId: string; userEmail: string; userName?: string }) {
  const inv = await this.prisma.workspaceInvite.findFirst({
    where: { workspace_invite_id: params.inviteId, deleted: 0, active: 1 },
  });
  if (!inv) throw new NotFoundException('Invitation introuvable');
  if (inv.status !== InviteStatus.PENDING) throw new BadRequestException('Invitation non valide');

  // expirée ?
  if (inv.expires_at.getTime() < Date.now()) {
    await this.prisma.workspaceInvite.update({
      where: { workspace_invite_id: inv.workspace_invite_id },
      data: { status: InviteStatus.EXPIRED },
    });
    throw new BadRequestException('Invitation expirée');
  }

  const myEmail = (params.userEmail ?? '').toLowerCase().trim();
  if (!myEmail || myEmail !== inv.email) {
    throw new ForbiddenException('Cette invitation ne correspond pas à votre email');
  }

  // membership
  await this.prisma.workspaceMember.upsert({
    where: { workspace_id_user_id: { workspace_id: inv.workspace_id, user_id: params.userId } },
    update: {
      role: inv.role as WorkspaceRole,
      updator_id: params.userId,
      updator_name: params.userName ?? myEmail,
      active: 1,
      deleted: 0,
    },
    create: {
      workspace_id: inv.workspace_id,
      user_id: params.userId,
      role: inv.role as WorkspaceRole,
      creator_id: params.userId,
      creator_name: params.userName ?? myEmail,
      active: 1,
      deleted: 0,
    },
  });

  // update invite
  await this.prisma.workspaceInvite.update({
    where: { workspace_invite_id: inv.workspace_invite_id },
    data: {
      status: InviteStatus.ACCEPTED,
      accepted_by_user_id: params.userId,
      updator_id: params.userId,
      updator_name: params.userName ?? myEmail,
    },
  });

  //  mark notification as read (UX)
  await this.prisma.notification.updateMany({
    where: {
      user_id: params.userId,
      type: 'WORKSPACE_INVITE',
      reference_id: inv.workspace_invite_id,
      deleted: 0,
      active: 1,
    },
    data: { read: 1, updator_id: params.userId, updator_name: params.userName ?? myEmail },
  });

  return { ok: true, workspace_id: inv.workspace_id };
}


async rejectInvite(params: { inviteId: string; userId: string; userEmail: string; userName?: string }) {
  const inv = await this.prisma.workspaceInvite.findFirst({
    where: { workspace_invite_id: params.inviteId, deleted: 0, active: 1 },
  });
  if (!inv) throw new NotFoundException('Invitation introuvable');
  if (inv.status !== InviteStatus.PENDING) return { ok: true };

  const myEmail = (params.userEmail ?? '').toLowerCase().trim();
  if (!myEmail || myEmail !== inv.email) {
    throw new ForbiddenException('Cette invitation ne correspond pas à votre email');
  }

  await this.prisma.workspaceInvite.update({
    where: { workspace_invite_id: inv.workspace_invite_id },
    data: {
      status: InviteStatus.REVOKED, // ou EXPIRED si tu veux distinguer
      updator_id: params.userId,
      updator_name: params.userName ?? myEmail,
    },
  });

  //  mark notification as read (UX)
  await this.prisma.notification.updateMany({
    where: {
      user_id: params.userId,
      type: 'WORKSPACE_INVITE',
      reference_id: inv.workspace_invite_id,
      deleted: 0,
      active: 1,
    },
    data: { read: 1, updator_id: params.userId, updator_name: params.userName ?? myEmail },
  });

  return { ok: true };
}


}

