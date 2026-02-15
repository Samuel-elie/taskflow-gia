import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CommonModule } from '../common/common.module';

/**
 * Module Projects :
 * - Regroupe le controller et le service liés aux projets.
 * - Structure NestJS classique, lisible et testable.
 * ProjectsModule :
 * - Importe CommonModule pour accéder à WorkspaceAccessService.
 */
@Module({
  imports: [CommonModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
