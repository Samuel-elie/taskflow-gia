import { Injectable } from '@nestjs/common';
import { WorkspaceAccessService } from '../common/services/workspace-access.service';

@Injectable()
export class WorkspacesMeService {
  constructor(private workspaceAccess: WorkspaceAccessService) {}

  async getMyRole(params: { workspaceId: string; actorUserId: string }) {
    const { workspaceId, actorUserId } = params;

    // ton service retourne déjà un WorkspaceRole (enum Prisma)
    const role = await this.workspaceAccess.getRole(workspaceId, actorUserId);

    return { role };
  }
}
