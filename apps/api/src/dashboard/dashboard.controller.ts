import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

/**
 * DashboardController :
 * - Expose une vue agrégée pour la page d'accueil/démo.
 */
@UseGuards(JwtAuthGuard)
@Controller()
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  /**
   * GET /dashboard
   * Retourne:
   * - workspaces + projets
   * - counts tâches assignées
   * - unread notifications count
   */
  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.dashboard.getDashboard({
      actorUserId: user.sub,
    });
  }
}
