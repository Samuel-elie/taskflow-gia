import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  /**
   * GET /notifications/me?page=1&pageSize=20&unreadOnly=1
   * Liste mes notifications.
   */
  @Get('me')
  listMine(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notifications.listMine({
      userId: user.sub,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      unreadOnly: unreadOnly ? (Number(unreadOnly) as 0 | 1) : undefined,
    });
  }

  /**
   * PATCH /notifications/:notificationId/read
   * Marquer une notification comme lue.
   */
  @Patch(':notificationId/read')
  markRead(@CurrentUser() user: any, @Param('notificationId') notificationId: string) {
    return this.notifications.markAsRead({
      notificationId,
      actorUserId: user.sub,
    });
  }
}
