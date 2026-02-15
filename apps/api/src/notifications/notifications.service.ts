import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Liste les notifications de l'utilisateur connecté.
   * MVP: pagination simple via page/pageSize.
   */
  async listMine(params: { userId: string; page?: number; pageSize?: number; unreadOnly?: 0 | 1 }) {
    const { userId, page = 1, pageSize = 20, unreadOnly } = params;

    const skip = (page - 1) * pageSize;

    const where: any = {
      user_id: userId,
      deleted: 0,
      active: 1,
    };

    if (unreadOnly === 1) where.read = 0;

    const [total, items] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { creation_date: 'desc' },
        skip,
        take: pageSize,
        select: {
          notification_id: true,
          type: true,
          message: true,
          read: true,
          creation_date: true,
            reference_id: true,
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items,
    };
  }

  /**
   * Marque une notification comme lue.
   * Règle: on vérifie que la notification appartient bien à l'utilisateur.
   */
  async markAsRead(params: { notificationId: string; actorUserId: string }) {
    const { notificationId, actorUserId } = params;

    const notif = await this.prisma.notification.findFirst({
      where: { notification_id: notificationId, deleted: 0, active: 1 },
      select: { notification_id: true, user_id: true, read: true },
    });

    if (!notif) throw new NotFoundException('Notification introuvable');

    if (notif.user_id !== actorUserId) {
      throw new ForbiddenException("Accès refusé : cette notification ne vous appartient pas");
    }

    // Si déjà lue, on renvoie un ok sans forcer une update inutile
    if (notif.read === 1) return { ok: true, alreadyRead: true };

    await this.prisma.notification.update({
      where: { notification_id: notificationId },
      data: {
        read: 1,
        updator_id: actorUserId,
        updator_name: actorUserId,
      },
    });

    return { ok: true };
  }
}
