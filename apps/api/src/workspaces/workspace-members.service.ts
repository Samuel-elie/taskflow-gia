import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../common/services/workspace-access.service';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class WorkspaceMembersService {
  constructor(
    private prisma: PrismaService,
    private workspaceAccess: WorkspaceAccessService,
  ) {}

  async list(params: { workspaceId: string; actorUserId: string }) {
    const { workspaceId, actorUserId } = params;

    await this.workspaceAccess.assertMember(workspaceId, actorUserId);

    return this.prisma.workspaceMember.findMany({
      where: { workspace_id: workspaceId, deleted: 0, active: 1 },
      orderBy: [{ role: 'asc' }, { creation_date: 'asc' }],
      select: {
        workspace_member_id: true,
        role: true,
        user: { select: { user_id: true, email: true, name: true } },
      },
    });
  }

  async remove(params: { workspaceId: string; memberId: string; actorUserId: string }) {
    const { workspaceId, memberId, actorUserId } = params;

    // OWNER/MANAGER only
    await this.workspaceAccess.assertCanManageTasks(workspaceId, actorUserId);

    const m = await this.prisma.workspaceMember.findFirst({
      where: { workspace_member_id: memberId, workspace_id: workspaceId, deleted: 0, active: 1 },
      select: { workspace_member_id: true, role: true, user_id: true },
    });
    if (!m) throw new NotFoundException('Membre introuvable');

    // Option sécurité : empêcher de retirer un OWNER si actor n'est pas OWNER
    const actorRole = await this.workspaceAccess.getRole(workspaceId, actorUserId);
    if (m.role === WorkspaceRole.OWNER && actorRole !== WorkspaceRole.OWNER) {
      throw new ForbiddenException("Seul un OWNER peut retirer un OWNER");
    }

    await this.prisma.workspaceMember.update({
      where: { workspace_member_id: memberId },
      data: { deleted: 1, active: 0, deleted_date: new Date(), deletor_id: actorUserId },
    });

    return { ok: true };
  }
}
