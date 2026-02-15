import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../common/services/workspace-access.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private workspaceAccess: WorkspaceAccessService,
  ) {}

  // lecture/listing: membre suffit
  private async assertWorkspaceAccess(workspaceId: string, userId: string) {
    await this.workspaceAccess.assertMember(workspaceId, userId);
  }

  // create/update/delete: OWNER/MANAGER
  private async assertWorkspaceManage(workspaceId: string, userId: string) {
    // alias neutre recommandé (sinon garde assertCanManageTasks)
    await this.workspaceAccess.assertCanManageTasks(workspaceId, userId);
  }

  async createProject(params: {
    workspaceId: string;
    name: string;
    description?: string;
    actor: { sub: string; name: string; email: string };
  }) {
    const { workspaceId, name, description, actor } = params;

    await this.assertWorkspaceManage(workspaceId, actor.sub);

    const ws = await this.prisma.workspace.findFirst({
      where: { workspace_id: workspaceId, deleted: 0 },
      select: { workspace_id: true },
    });
    if (!ws) throw new NotFoundException('Workspace introuvable');

    return this.prisma.project.create({
      data: {
        name,
        description: description ?? null,
        workspace_id: workspaceId,
        owner_id: actor.sub, // MVP: owner = créateur

        creator_id: actor.sub,
        creator_name: actor.name || actor.email,
        active: 1,
        deleted: 0,
      },
      select: {
        project_id: true,
        name: true,
        description: true,
        workspace_id: true,
        owner_id: true,
        active: true,
        creation_date: true,
      },
    });
  }

  async listProjectsByWorkspace(params: { workspaceId: string; userId: string }) {
    const { workspaceId, userId } = params;

    await this.assertWorkspaceAccess(workspaceId, userId);

    return this.prisma.project.findMany({
      where: {
        workspace_id: workspaceId,
        deleted: 0,
      },
      select: {
        project_id: true,
        name: true,
        description: true,
        owner_id: true,
        active: true,
        creation_date: true,
        last_update_date: true,
      },
      orderBy: { creation_date: 'desc' },
    });
  }

  async getProjectDetails(params: { projectId: string; userId: string }) {
    const { projectId, userId } = params;

    const project = await this.prisma.project.findFirst({
      where: { project_id: projectId, deleted: 0, active: 1 },
      select: {
        project_id: true,
        name: true,
        description: true,
        workspace_id: true,
        owner_id: true,
        creation_date: true,
      },
    });

    if (!project) throw new NotFoundException('Projet introuvable');

    await this.assertWorkspaceAccess(project.workspace_id, userId);

    const counts = await this.prisma.task.groupBy({
      by: ['status'],
      where: {
        project_id: project.project_id,
        deleted: 0,
        active: 1,
      },
      _count: { status: true },
    });

    return { ...project, taskCounts: counts };
  }

  //  renommé (manage-only)
  async updateProjectManageOnly(params: {
    projectId: string;
    dto: { name?: string; description?: string };
    actor: { sub: string; name: string; email: string };
  }) {
    const { projectId, dto, actor } = params;

    const project = await this.prisma.project.findFirst({
      where: { project_id: projectId, deleted: 0, active: 1 },
      select: { project_id: true, workspace_id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    await this.assertWorkspaceManage(project.workspace_id, actor.sub);

    return this.prisma.project.update({
      where: { project_id: projectId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        updator_id: actor.sub,
        updator_name: actor.name || actor.email,
      },
      select: {
        project_id: true,
        name: true,
        description: true,
        owner_id: true,
        workspace_id: true,
        last_update_date: true,
      },
    });
  }

  //  renommé (manage-only)
  async softDeleteProjectManageOnly(params: {
    projectId: string;
    actor: { sub: string; name: string; email: string };
  }) {
    const { projectId, actor } = params;

    const project = await this.prisma.project.findFirst({
      where: { project_id: projectId, deleted: 0, active: 1 },
      select: { project_id: true, workspace_id: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    await this.assertWorkspaceManage(project.workspace_id, actor.sub);

    await this.prisma.project.update({
      where: { project_id: projectId },
      data: {
        deleted: 1,
        active: 0,
        deleted_date: new Date(),
        deletor_id: actor.sub,
        deletor_name: actor.name || actor.email,
      },
    });

    return { ok: true };
  }

  async listProjectMembers(params: { projectId: string; actorUserId: string }) {
    const { projectId, actorUserId } = params;

    const project = await this.prisma.project.findFirst({
      where: { project_id: projectId, deleted: 0, active: 1 },
      select: { workspace_id: true },
    });

    if (!project) throw new NotFoundException('Projet introuvable');

    await this.assertWorkspaceAccess(project.workspace_id, actorUserId);

    return this.prisma.workspaceMember.findMany({
      where: { workspace_id: project.workspace_id, deleted: 0, active: 1 },
      orderBy: { creation_date: 'asc' },
      select: {
        workspace_member_id: true,
        role: true,
        creation_date: true,
        user: {
          select: { user_id: true, email: true, name: true },
        },
      },
    });
  }

  async getMyRoleInProject({ projectId, userId }: { projectId: string; userId: string }) {
    const project = await this.prisma.project.findFirst({
      where: { project_id: projectId, deleted: 0, active: 1 },
      select: { workspace_id: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { workspace_id: project.workspace_id, user_id: userId } },
      select: { role: true },
    });

    return { user_id: userId, role: membership?.role ?? 'MEMBER' };
  }
}
