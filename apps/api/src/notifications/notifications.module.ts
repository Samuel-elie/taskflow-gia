import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Module Notifications :
 * - Permet de consulter les notifications et les marquer comme lues.
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
