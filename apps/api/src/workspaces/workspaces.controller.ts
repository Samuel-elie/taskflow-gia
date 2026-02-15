import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private workspaces: WorkspacesService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateWorkspaceDto) {
    return this.workspaces.createWorkspace({ name: dto.name, creator: user });
  }

  @Get('me')
  listMine(@CurrentUser() user: any) {
    return this.workspaces.listMyWorkspaces(user.sub);
  }

  @Get(':workspaceId/me')
  me(@CurrentUser() user: any, @Param('workspaceId') workspaceId: string) {
    return this.workspaces.me({ workspaceId, actorUserId: user.sub });
  }

  @Post(':workspaceId/members')
  addMember(@CurrentUser() user: any, @Param('workspaceId') workspaceId: string, @Body() dto: AddMemberDto) {
    return this.workspaces.addMember({
      workspaceId,
      email: dto.email,
      role: dto.role,
      actor: user,
    });
  }

  @Get(':workspaceId/members')
  listMembers(@CurrentUser() user: any, @Param('workspaceId') workspaceId: string) {
    return this.workspaces.listMembers({ workspaceId, actorUserId: user.sub });
  }

  @Get(':workspaceId/users')
  listUsers(@CurrentUser() user: any, @Param('workspaceId') workspaceId: string) {
    return this.workspaces.listWorkspaceUsers({ workspaceId, actorUserId: user.sub });
  }

  @Patch(':workspaceId')
  update(@CurrentUser() user: any, @Param('workspaceId') workspaceId: string, @Body() dto: UpdateWorkspaceDto) {
    return this.workspaces.updateWorkspaceOwnerOnly({ workspaceId, dto, actor: user });
  }

  @Delete(':workspaceId')
  softDelete(@CurrentUser() user: any, @Param('workspaceId') workspaceId: string) {
    return this.workspaces.softDeleteWorkspaceOwnerOnly({ workspaceId, actor: user });
  }

  @Patch(':workspaceId/toggle-active')
  toggleActive(@CurrentUser() user: any, @Param('workspaceId') workspaceId: string) {
    return this.workspaces.toggleActiveOwnerOnly({ workspaceId, actor: user });
  }

  @Post('invites/:inviteId/accept')
  acceptInvite(@CurrentUser() user: any, @Param('inviteId') inviteId: string) {
    return this.workspaces.acceptInvite({
      inviteId,
      userId: user.sub,
      userEmail: user.email,
      userName: user.name,
    });
  }

  @Post('invites/:inviteId/reject')
  rejectInvite(@CurrentUser() user: any, @Param('inviteId') inviteId: string) {
    return this.workspaces.rejectInvite({
      inviteId,
      userId: user.sub,
      userEmail: user.email,
      userName: user.name,
    });
  }

}
