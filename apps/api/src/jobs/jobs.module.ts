import { Module } from '@nestjs/common';
import { DeadlineSoonJob } from './deadline-soon.job';

/**
 * JobsModule :
 * - Centralise les cron jobs (tâches planifiées).
 * - Évite de mélanger le code métier (TasksService) et la planification.
 */
@Module({
  providers: [DeadlineSoonJob],
})
export class JobsModule {}
