import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../common/services/workspace-access.service';
import * as crypto from 'crypto';

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

@Injectable()
export class WorkspaceInvitesService {
  constructor(
    private prisma: PrismaService,
    private access: WorkspaceAccessService,
  ) {}

  async list(workspaceId: string, actorUserId: string) {
    await this.access.assertMember(workspaceId, actorUserId);

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
        accepted_by_user_id: true,
      },
    });
  }

  async create(params: { workspaceId: string; dto: any; actor: any; appBaseUrl: string }) {
    const { workspaceId, dto, actor, appBaseUrl } = params;

    await this.access.assertPrivileged(workspaceId, actor.sub);

    const email = dto.email.toLowerCase().trim();
    const role = dto.role ?? 'MEMBER';

    // 1) si user existe => add direct membership
    const user = await this.prisma.user.findFirst({
      where: { email, deleted: 0, active: 1 },
      select: { user_id: true, email: true, name: true },
    });

    if (user) {
      // upsert membership
      const member = await this.prisma.workspaceMember.upsert({
        where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: user.user_id } },
        update: {
          role,
          updator_id: actor.sub,
          updator_name: actor.name || actor.email,
          active: 1,
          deleted: 0,
        },
        create: {
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
          role: true,
          user: { select: { user_id: true, email: true, name: true } },
        },
      });

      return { mode: 'DIRECT_ADD', member };
    }

    // 2) sinon => invite simulée
    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = sha256(rawToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // option: invalider anciennes invites PENDING même email
    await this.prisma.workspaceInvite.updateMany({
      where: { workspace_id: workspaceId, email, status: 'PENDING', deleted: 0 },
      data: { status: 'REVOKED', updator_id: actor.sub, updator_name: actor.name || actor.email },
    });

    const invite = await this.prisma.workspaceInvite.create({
      data: {
        workspace_id: workspaceId,
        email,
        role,
        token_hash: tokenHash,
        expires_at: expiresAt,
        status: 'PENDING',
        creator_id: actor.sub,
        creator_name: actor.name || actor.email,
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

    const invite_link = `${appBaseUrl.replace(/\/$/, '')}/invites/${rawToken}`;

    return { mode: 'INVITE', invite, invite_link };
  }

  async revoke(params: { workspaceId: string; inviteId: string; actor: any }) {
    const { workspaceId, inviteId, actor } = params;

    await this.access.assertPrivileged(workspaceId, actor.sub);

    const inv = await this.prisma.workspaceInvite.findFirst({
      where: { workspace_invite_id: inviteId, workspace_id: workspaceId, deleted: 0, active: 1 },
      select: { workspace_invite_id: true, status: true },
    });
    if (!inv) throw new NotFoundException('Invite introuvable');

    if (inv.status !== 'PENDING') return { ok: true };

    await this.prisma.workspaceInvite.update({
      where: { workspace_invite_id: inviteId },
      data: {
        status: 'REVOKED',
        updator_id: actor.sub,
        updator_name: actor.name || actor.email,
      },
    });

    return { ok: true };
  }

  async previewByToken(rawToken: string) {
    const tokenHash = sha256(rawToken);

    const inv = await this.prisma.workspaceInvite.findFirst({
      where: { token_hash: tokenHash, deleted: 0, active: 1 },
      select: {
        workspace_invite_id: true,
        workspace_id: true,
        email: true,
        role: true,
        status: true,
        expires_at: true,
        workspace: { select: { name: true } },
      },
    });
    if (!inv) throw new NotFoundException('Invitation introuvable');

    return inv;
  }

  async accept(rawToken: string, actor: any) {
    const tokenHash = sha256(rawToken);

    const inv = await this.prisma.workspaceInvite.findFirst({
      where: { token_hash: tokenHash, deleted: 0, active: 1 },
      select: {
        workspace_invite_id: true,
        workspace_id: true,
        email: true,
        role: true,
        status: true,
        expires_at: true,
      },
    });
    if (!inv) throw new NotFoundException('Invitation introuvable');

    if (inv.status !== 'PENDING') throw new BadRequestException('Invitation non valide');
    if (inv.expires_at.getTime() < Date.now()) {
      await this.prisma.workspaceInvite.update({
        where: { workspace_invite_id: inv.workspace_invite_id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation expirée');
    }

    const myEmail = (actor.email ?? '').toLowerCase().trim();
    if (!myEmail || myEmail !== inv.email) {
      throw new ForbiddenException('Cette invitation ne correspond pas à votre email');
    }

    // membership
    await this.prisma.workspaceMember.upsert({
      where: { workspace_id_user_id: { workspace_id: inv.workspace_id, user_id: actor.sub } },
      update: {
        role: inv.role as any,
        updator_id: actor.sub,
        updator_name: actor.name || actor.email,
        active: 1,
        deleted: 0,
      },
      create: {
        workspace_id: inv.workspace_id,
        user_id: actor.sub,
        role: inv.role as any,
        creator_id: actor.sub,
        creator_name: actor.name || actor.email,
        active: 1,
        deleted: 0,
      },
    });

    await this.prisma.workspaceInvite.update({
      where: { workspace_invite_id: inv.workspace_invite_id },
      data: {
        status: 'ACCEPTED',
        accepted_by_user_id: actor.sub,
        updator_id: actor.sub,
        updator_name: actor.name || actor.email,
      },
    });

    return { ok: true, workspace_id: inv.workspace_id };
  }
}
