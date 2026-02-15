import { Module } from '@nestjs/common';
import { WorkspaceAccessService } from './services/workspace-access.service';

/**
 * CommonModule :
 * - Regroupe des services partagés (accès workspace, helpers, etc.).
 * - Évite les dépendances circulaires entre modules métier.
 */
@Module({
  providers: [WorkspaceAccessService],
  exports: [WorkspaceAccessService],
})
export class CommonModule {}
