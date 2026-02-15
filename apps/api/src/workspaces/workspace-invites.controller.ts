import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceInvitesService } from './workspace-invites.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class WorkspaceInvitesController {
  constructor(private readonly invites: WorkspaceInvitesService) {}

  /**
   * GET /workspaces/:workspaceId/invites
   */
  @Get('workspaces/:workspaceId/invites')
  list(@CurrentUser() user: any, @Param('workspaceId') workspaceId: string) {
    return this.invites.list({ workspaceId, actorUserId: user.sub });
  }

  /**
   * POST /workspaces/:workspaceId/invites
   * body: { email, role }
   */
  @Post('workspaces/:workspaceId/invites')
  create(
    @CurrentUser() user: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: { email: string; role?: 'OWNER' | 'MANAGER' | 'MEMBER' },
  ) {
    return this.invites.create({
      workspaceId,
      dto,
      actor: user,
    });
  }

  /**
   * DELETE /workspaces/:workspaceId/invites/:inviteId
   */
  @Delete('workspaces/:workspaceId/invites/:inviteId')
  revoke(
    @CurrentUser() user: any,
    @Param('workspaceId') workspaceId: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.invites.revoke({ workspaceId, inviteId, actorUserId: user.sub });
  }
}
