import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspacesMeService } from './workspaces-me.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class WorkspacesMeController {
  constructor(private readonly me: WorkspacesMeService) {}

  /**
   * GET /workspaces/:workspaceId/me
   * Retourne le rôle du user dans ce workspace
   */
  @Get('workspaces/:workspaceId/me')
  getMyRole(@CurrentUser() user: any, @Param('workspaceId') workspaceId: string) {
    return this.me.getMyRole({ workspaceId, actorUserId: user.sub });
  }
}
