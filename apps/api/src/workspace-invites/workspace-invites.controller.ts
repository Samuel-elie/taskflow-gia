import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceInvitesService } from './workspace-invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class WorkspaceInvitesController {
  constructor(private invites: WorkspaceInvitesService) {}

  @Get('workspaces/:workspaceId/invites')
  list(@CurrentUser() user: any, @Param('workspaceId') workspaceId: string) {
    return this.invites.list(workspaceId, user.sub);
  }

  @Post('workspaces/:workspaceId/invites')
  create(
    @CurrentUser() user: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateInviteDto,
  ) {
    // adapte base url à ton env front
    const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
    return this.invites.create({ workspaceId, dto, actor: user, appBaseUrl });
  }

  @Delete('workspaces/:workspaceId/invites/:inviteId')
  revoke(
    @CurrentUser() user: any,
    @Param('workspaceId') workspaceId: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.invites.revoke({ workspaceId, inviteId, actor: user });
  }

  // preview (connecté) - optionnel utile pour la page /invites/:token
  @Get('invites/:token')
  preview(@Param('token') token: string) {
    return this.invites.previewByToken(token);
  }

  // accept
  @Post('invites/:token/accept')
  accept(@CurrentUser() user: any, @Param('token') token: string) {
    return this.invites.accept(token, user);
  }
}
