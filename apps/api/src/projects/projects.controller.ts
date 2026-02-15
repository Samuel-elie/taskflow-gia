import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  /**
   * POST /workspaces/:workspaceId/projects
   */
  @Post('workspaces/:workspaceId/projects')
  createProject(
    @CurrentUser() user: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projects.createProject({
      workspaceId,
      name: dto.name,
      description: dto.description,
      actor: user,
    });
  }

  /**
   * GET /workspaces/:workspaceId/projects
   */
  @Get('workspaces/:workspaceId/projects')
  listProjects(@CurrentUser() user: any, @Param('workspaceId') workspaceId: string) {
    return this.projects.listProjectsByWorkspace({
      workspaceId,
      userId: user.sub,
    });
  }

  /**
   * GET /projects/:projectId
   */
  @Get('projects/:projectId')
  getProject(@CurrentUser() user: any, @Param('projectId') projectId: string) {
    return this.projects.getProjectDetails({
      projectId,
      userId: user.sub,
    });
  }

  /**
   * PATCH /projects/:projectId
   * Option A: OWNER/MANAGER du workspace
   */
  @Patch('projects/:projectId')
  updateProject(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    // ✅ nouveau nom
    return this.projects.updateProjectManageOnly({
      projectId,
      dto,
      actor: user,
    });
  }

  /**
   * DELETE /projects/:projectId
   * Option A: OWNER/MANAGER du workspace
   */
  @Delete('projects/:projectId')
  deleteProject(@CurrentUser() user: any, @Param('projectId') projectId: string) {
    // ✅ nouveau nom
    return this.projects.softDeleteProjectManageOnly({
      projectId,
      actor: user,
    });
  }

  /**
   * GET /projects/:projectId/members
   */
  @Get('projects/:projectId/members')
  listMembers(@CurrentUser() user: any, @Param('projectId') projectId: string) {
    return this.projects.listProjectMembers({
      projectId,
      actorUserId: user.sub,
    });
  }

  /**
   * GET /projects/:projectId/me
   */
  @Get('projects/:projectId/me')
  getMyRoleInProject(@CurrentUser() user: any, @Param('projectId') projectId: string) {
    return this.projects.getMyRoleInProject({
      projectId,
      userId: user.sub,
    });
  }
}
