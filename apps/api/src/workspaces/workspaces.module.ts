import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

import { WorkspaceMembersController } from './workspace-members.controller';
import { WorkspaceMembersService } from './workspace-members.service';
import { WorkspaceInvitesController } from './workspace-invites.controller';
import { WorkspaceInvitesService } from './workspace-invites.service';

@Module({
  imports: [CommonModule],
  controllers: [WorkspacesController, WorkspaceMembersController, WorkspaceInvitesController],
  providers: [WorkspacesService, WorkspaceMembersService, WorkspaceInvitesService],
})
export class WorkspacesModule {}
