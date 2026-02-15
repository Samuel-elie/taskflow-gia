import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * DashboardModule :
 * - Regroupe les endpoints "vue globale" pour le front.
 * - Évite de multiplier les appels réseau côté UI.
 */
@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
