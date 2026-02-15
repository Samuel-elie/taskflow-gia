import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../common/services/workspace-access.service';


@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private workspaceAccess: WorkspaceAccessService, // ✅ ajout ici
  ) {}
  /**
   * Vérifie que l'utilisateur est membre du workspace.
   * Choix:
   * - Faire la vérification dans chaque méthode : répétitif.
   * - Centraliser via une méthode utilitaire : plus propre.
   * Choix retenu : centralisation ici.
   */
  private async assertWorkspaceAccess(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspace_id: workspaceId,
        user_id: userId,
        deleted: 0,
        active: 1,
      },
      select: { workspace_member_id: true },
    });

    if (!membership) {
      throw new ForbiddenException("Accès refusé : vous n'êtes pas membre de ce workspace");
    }
  }

  /**
   * Crée un projet dans un workspace.
   * - owner_id reste obligatoire (MVP).
   * - workspace_id relie le projet au conteneur SaaS.
   */
  async createProject(params: {
    workspaceId: string;
    name: string;
    description?: string;
    actor: { sub: string; name: string; email: string };
  }) {
    const { workspaceId, name, description, actor } = params;

    // 1) Vérifier l'accès au workspace
    await this.assertWorkspaceAccess(workspaceId, actor.sub);

    // 2) Vérifier que le workspace existe et est actif
    const ws = await this.prisma.workspace.findFirst({
      where: { workspace_id: workspaceId, deleted: 0 },
      select: { workspace_id: true },
    });
    if (!ws) throw new NotFoundException('Workspace introuvable');

    // 3) Créer le projet
    return this.prisma.project.create({
      data: {
        name,
        description,

        workspace_id: workspaceId,

        // MVP: owner obligatoire = utilisateur connecté
        owner_id: actor.sub,

        // Audit
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
        creation_date: true,
      },
    });
  }

  /**
   * Liste les projets d'un workspace accessibles à l'utilisateur.
   * Choix:
   * - Lister tous les projets du workspace sans check membership : fail sécurité.
   * - Check membership + filtrer active/deleted : correct.
   * Choix retenu : membership + flags.
   */
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

  /**
   * Détail d'un projet (sécurisé via workspace membership).
   * On retourne aussi un résumé utile (ex: compteur de tâches) pour le front.
   */
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

    // Vérifie l'accès via workspace
    await this.assertWorkspaceAccess(project.workspace_id, userId);

    // Bonus simple: compteur de tâches par statut (utile UI)
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

   /**
   * Met à jour un projet (owner-only).
   * Règle: seul owner_id peut modifier.
   */
  async updateProjectOwnerOnly(params: {
    projectId: string;
    dto: { name?: string; description?: string };
    actor: { sub: string; name: string; email: string };
  }) {
    const { projectId, dto, actor } = params;

    /**
     * Choix:
     * - findFirst puis update : 2 requêtes, mais permet un message d'erreur clair.
     * - update direct + catch : 1 requête, mais erreurs moins lisibles.
     * Choix retenu : findFirst + update (MVP lisible).
     */
    const project = await this.prisma.project.findFirst({
      where: { project_id: projectId, deleted: 0, active: 1 },
      select: { project_id: true, owner_id: true },
    });

    if (!project) throw new NotFoundException('Projet introuvable');

    // Vérification owner-only
    if (project.owner_id !== actor.sub) {
      throw new ForbiddenException("Accès refusé : seul le propriétaire du projet peut modifier");
    }

    // Mise à jour partielle
    return this.prisma.project.update({
      where: { project_id: projectId },
      data: {
        name: dto.name,
        description: dto.description,

        // Audit
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

  /**
   * Soft delete d'un projet (owner-only).
   * Règle: seul owner_id peut supprimer.
   */
  async softDeleteProjectOwnerOnly(params: {
    projectId: string;
    actor: { sub: string; name: string; email: string };
  }) {
    const { projectId, actor } = params;

    const project = await this.prisma.project.findFirst({
      where: { project_id: projectId, deleted: 0, active: 1 },
      select: { project_id: true, owner_id: true },
    });

    if (!project) throw new NotFoundException('Projet introuvable');

    if (project.owner_id !== actor.sub) {
      throw new ForbiddenException("Accès refusé : seul le propriétaire du projet peut supprimer");
    }

    /**
     * Choix:
     * - Delete physique : simple mais perte d'historique (non cohérent avec tes flags).
     * - Soft delete : cohérent avec ton modèle audit/flags.
     * Choix retenu : soft delete.
     */
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

   /**
   * Liste les membres du workspace d'un projet (bonus UX).
   * Règles:
   * - le projet doit exister (active/deleted)
   * - l'acteur doit être membre du workspace du projet
   */
  async listProjectMembers(params: { projectId: string; actorUserId: string }) {
    const { projectId, actorUserId } = params;

    /**
     * Choix:
     * - include workspace + members : trop de données.
     * - select minimal workspace_id : plus performant.
     * Choix retenu : select minimal.
     */
    const project = await this.prisma.project.findFirst({
      where: { project_id: projectId, deleted: 0, active: 1 },
      select: { workspace_id: true },
    });

    if (!project) throw new NotFoundException('Projet introuvable');

    // Vérifie que l'acteur est membre du workspace
    await this.workspaceAccess.assertMember(project.workspace_id, actorUserId);

    // Retourne les membres (rôle + user minimal)
    return this.prisma.workspaceMember.findMany({
      where: {
        workspace_id: project.workspace_id,
        deleted: 0,
        active: 1,
      },
      orderBy: { creation_date: 'asc' },
      select: {
        workspace_member_id: true,
        role: true,
        creation_date: true,
        user: {
          select: {
            user_id: true,
            email: true,
            name: true,
          },
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

    return {
      user_id: userId,
      role: membership?.role ?? 'MEMBER',
    };
  }
}
