import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class CommentsController {
  constructor(private comments: CommentsService) {}

  /**
   * POST /tasks/:taskId/comments
   * Crée un commentaire sur une tâche (avec mentions).
   */
  @Post('tasks/:taskId/comments')
  create(
    @CurrentUser() user: any,
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.createComment({
      taskId,
      content: dto.content,
      actor: {
        sub: user.sub,
        name: user?.name,
        email: user?.email,
      },
    });
  }

  /**
   * GET /tasks/:taskId/comments
   * Liste les commentaires d'une tâche.
   */
  @Get('tasks/:taskId/comments')
  list(@CurrentUser() user: any, @Param('taskId') taskId: string) {
    return this.comments.listComments({
      taskId,
      actorUserId: user.sub,
    });
  }
}
