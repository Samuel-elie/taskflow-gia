import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../common/services/workspace-access.service';
import { InviteStatus, WorkspaceRole } from '@prisma/client';
import * as crypto from 'crypto';

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

@Injectable()
export class WorkspaceInvitesService {
  constructor(
    private prisma: PrismaService,
    private workspaceAccess: WorkspaceAccessService,
  ) {}

  async list(params: { workspaceId: string; actorUserId: string }) {
    const { workspaceId, actorUserId } = params;

    // OWNER/MANAGER
    await this.workspaceAccess.assertCanManageTasks(workspaceId, actorUserId);

    return this.prisma.workspaceInvite.findMany({
      where: { workspace_id: workspaceId, deleted: 0, active: 1 },
      orderBy: { creation_date: 'desc' },
      select: {
        workspace_invite_id: true,
        email: true,
        role: true,
        status: true,
        expires_at: true,
        creation_date: true,
      },
    });
  }

  async create(params: {
    workspaceId: string;
    dto: { email: string; role?: 'OWNER' | 'MANAGER' | 'MEMBER' };
    actor: { sub: string; name?: string; email?: string };
  }) {
    const { workspaceId, dto, actor } = params;

    await this.workspaceAccess.assertCanManageTasks(workspaceId, actor.sub);

    const email = (dto.email ?? '').toLowerCase().trim();
    if (!email.includes('@')) throw new BadRequestException('Email invalide');

    const role: WorkspaceRole = (dto.role as WorkspaceRole) ?? WorkspaceRole.MEMBER;

    //  Vérifier workspace (pour le nom dans le message)
    const workspace = await this.prisma.workspace.findFirst({
      where: { workspace_id: workspaceId, deleted: 0 },
      select: { workspace_id: true, name: true },
    });
    if (!workspace) throw new NotFoundException('Workspace introuvable');

    //  Trouver l’utilisateur invité (pour pouvoir créer une notif)
    const invitedUser = await this.prisma.user.findFirst({
      where: { email, deleted: 0, active: 1 },
      select: { user_id: true, email: true, name: true },
    });

    // token clair (1 seule fois), stocké hashé
    const token = crypto.randomBytes(24).toString('hex');
    const token_hash = sha256(token);
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

    const created = await this.prisma.workspaceInvite.create({
      data: {
        workspace_id: workspaceId,
        email,
        role,
        token_hash,
        expires_at,
        status: InviteStatus.PENDING,
        creator_id: actor.sub,
        creator_name: actor.name || actor.email || '',
        active: 1,
        deleted: 0,
      },
      select: {
        workspace_invite_id: true,
        email: true,
        role: true,
        status: true,
        expires_at: true,
        creation_date: true,
      },
    });

    //  Créer une notification si l’utilisateur existe déjà
    // (si tu veux inviter un email qui n’existe pas encore en DB → on skip la notif)
  // Créer une notification si l’utilisateur existe déjà
//  Créer une notification si l’utilisateur existe déjà
if (invitedUser) {
  await this.prisma.notification.create({
    data: {
      type: 'WORKSPACE_INVITE',
      message: `Vous avez été invité à rejoindre le workspace "${workspace.name}"`,
      read: 0,

      reference_id: created.workspace_invite_id,

      user_id: invitedUser.user_id,

      creator_id: actor.sub,
      creator_name: actor.name ?? actor.email ?? '',
      active: 1,
      deleted: 0,
    },
  });
}



    const invite_link =
      `${process.env.FRONT_URL ?? 'http://localhost:3000'}/invites/accept?token=${token}`;

    return { ...created, invite_link };
  }

  async revoke(params: { workspaceId: string; inviteId: string; actorUserId: string }) {
    const { workspaceId, inviteId, actorUserId } = params;

    await this.workspaceAccess.assertCanManageTasks(workspaceId, actorUserId);

    const inv = await this.prisma.workspaceInvite.findFirst({
      where: { workspace_invite_id: inviteId, workspace_id: workspaceId, deleted: 0, active: 1 },
      select: { workspace_invite_id: true },
    });
    if (!inv) throw new NotFoundException('Invitation introuvable');

    await this.prisma.workspaceInvite.update({
      where: { workspace_invite_id: inviteId },
      data: {
        status: InviteStatus.REVOKED,
        deleted: 1,
        active: 0,
        deleted_date: new Date(),
        deletor_id: actorUserId,
      },
    });

    return { ok: true };
  }
}
