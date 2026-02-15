import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';



/**
 * Controller Projects :
 * - Sécurisé JWT
 * - Reste mince (validation + délégation au service)
 */
@UseGuards(JwtAuthGuard)
@Controller()
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  /**
   * POST /workspaces/:workspaceId/projects
   * Crée un projet dans un workspace.
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
   * Liste les projets d'un workspace.
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
   * Détail d'un projet (sécurisé par membership workspace).
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
   * Update projet (owner-only).
   */
  @Patch('projects/:projectId')
  updateProject(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.updateProjectOwnerOnly({
      projectId,
      dto,
      actor: user,
    });
  }

  /**
   * DELETE /projects/:projectId
   * Soft delete projet (owner-only).
   */
  @Delete('projects/:projectId')
  deleteProject(@CurrentUser() user: any, @Param('projectId') projectId: string) {
    return this.projects.softDeleteProjectOwnerOnly({
      projectId,
      actor: user,
    });
  }

    /**
   * GET /projects/:projectId/members
   * Retourne les membres du workspace associé au projet.
   * Bonus UX: permet au front de remplir le dropdown d'assignation en 1 appel.
   */
  @Get('projects/:projectId/members')
  listMembers(@CurrentUser() user: any, @Param('projectId') projectId: string) {
    return this.projects.listProjectMembers({
      projectId,
      actorUserId: user.sub,
    });
  }

   @Get('projects/:projectId/me')
  getMyRoleInProject(@CurrentUser() user: any, @Param('projectId') projectId: string) {
    return this.projects.getMyRoleInProject({
      projectId,
      userId: user.sub,
    });
  }
}
