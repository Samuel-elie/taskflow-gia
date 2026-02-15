import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { TaskEventsModule } from '../task-events/task-events.module';

@Module({
  imports: [CommonModule, TaskEventsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
