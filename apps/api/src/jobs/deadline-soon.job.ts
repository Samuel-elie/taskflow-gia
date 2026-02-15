import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus } from '@prisma/client';

/**
 * DeadlineSoonJob :
 * - Envoie une notification quand une tâche approche de sa deadline.
 * - Anti-duplicate via Notification.type unique:
 *   "TASK_DEADLINE_SOON:{taskId}:{YYYY-MM-DD}"
 */
@Injectable()
export class DeadlineSoonJob {
  private readonly logger = new Logger(DeadlineSoonJob.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Génère une clé "jour" stable (YYYY-MM-DD) en UTC.
   * Choix:
   * - UTC : stable en production (serveurs).
   * - Locale : dépend du serveur/timezone.
   * Choix retenu : UTC.
   */
  private formatUtcDay(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Cron: toutes les heures.
   * - On notifie les tâches dont la deadline est dans les prochaines 24h.
   */
  @Cron('0 * * * *') // minute 0, chaque heure
  async handleDeadlineSoon() {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    /**
     * Choix (mini-benchmark):
     * - Tout faire en SQL brut : performant mais plus long à écrire/maintenir.
     * - Prisma findMany + boucles : suffisant MVP, clair.
     * Choix retenu : Prisma.
     */
    const tasks = await this.prisma.task.findMany({
      where: {
        deleted: 0,
        active: 1,
        status: { not: TaskStatus.DONE },

        assignee_id: { not: null },

        // deadline entre now et now+24h
        deadline: {
          gte: now,
          lte: next24h,
        },
      },
      select: {
        task_id: true,
        title: true,
        deadline: true,
        assignee_id: true,
      },
      take: 200, // limite MVP pour éviter un job trop long
      orderBy: { deadline: 'asc' },
    });

    if (tasks.length === 0) {
      this.logger.log('Aucune tâche "deadline proche" trouvée.');
      return;
    }

    let createdCount = 0;

    for (const task of tasks) {
      // Sécurité: assignee_id non null (typeguard simple)
      if (!task.assignee_id || !task.deadline) continue;

      // Type unique par tâche + jour (anti-duplicate)
      const dayKey = this.formatUtcDay(task.deadline);
      const uniqueType = `TASK_DEADLINE_SOON:${task.task_id}:${dayKey}`;

      /**
       * Anti-duplicate:
       * - On vérifie si une notification avec ce type existe déjà pour cet utilisateur.
       * Choix:
       * - check + create : 2 requêtes (ok MVP)
       * - upsert avec contrainte unique : nécessite migration (Option B)
       * Choix retenu : check + create (Option A).
       */
      const exists = await this.prisma.notification.findFirst({
        where: {
          user_id: task.assignee_id,
          type: uniqueType,
          deleted: 0,
          active: 1,
        },
        select: { notification_id: true },
      });

      if (exists) continue;

      // Message “humain” pour l’UI
      const deadlineIso = task.deadline.toISOString();
      const message = ` Deadline proche : "${task.title}" avant ${deadlineIso}`;

      await this.prisma.notification.create({
        data: {
          type: uniqueType,
          message,
          read: 0,
          user_id: task.assignee_id,

          // Audit minimal (cron = SYSTEM)
          creator_id: 'SYSTEM',
          creator_name: 'SYSTEM',
          active: 1,
          deleted: 0,
        },
      });

      createdCount++;
    }

    this.logger.log(`DeadlineSoonJob terminé. Notifications créées: ${createdCount}/${tasks.length}`);
  }
}
