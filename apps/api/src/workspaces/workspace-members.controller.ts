import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceMembersService } from './workspace-members.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class WorkspaceMembersController {
  constructor(private readonly members: WorkspaceMembersService) {}

  /**
   * GET /workspaces/:workspaceId/members
   */
  @Get('workspaces/:workspaceId/members')
  list(@CurrentUser() user: any, @Param('workspaceId') workspaceId: string) {
    return this.members.list({ workspaceId, actorUserId: user.sub });
  }

  /**
   * DELETE /workspaces/:workspaceId/members/:memberId
   */
  @Delete('workspaces/:workspaceId/members/:memberId')
  remove(
    @CurrentUser() user: any,
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.members.remove({ workspaceId, memberId, actorUserId: user.sub });
  }
}
