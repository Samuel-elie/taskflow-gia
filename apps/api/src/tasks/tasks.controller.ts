import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks.query.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { ListMyTasksQueryDto } from './dto/list-my-tasks.query.dto';
import { DesistTaskDto } from './dto/desist-task.dto';
import { ReassignTaskDto } from './dto/reassign-task.dto';


@UseGuards(JwtAuthGuard)
@Controller()
export class TasksController {
  constructor(private tasks: TasksService) {}

  /**
   * POST /projects/:projectId/tasks
   * Créer une tâche dans un projet.
   */
  @Post('projects/:projectId/tasks')
  create(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.createTask({
      projectId,
      dto,
      actor: user,
    });
  }

  /**
   * GET /projects/:projectId/tasks
   * Lister les tâches + pagination + filtres.
   */
  @Get('projects/:projectId/tasks')
  list(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasks.listTasksByProject({
      projectId,
      query,
      actorUserId: user.sub,
    });
  }

  /**
   * PATCH /tasks/:taskId
   * Mettre à jour une tâche.
   */
  @Patch('tasks/:taskId')
  update(
    @CurrentUser() user: any,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.updateTask({
      taskId,
      dto,
      actor: user,
    });
  }

  /**
   * DELETE /tasks/:taskId
   * Supprimer (soft delete) une tâche.
   */
  @Delete('tasks/:taskId')
  remove(@CurrentUser() user: any, @Param('taskId') taskId: string) {
    return this.tasks.deleteTask({
      taskId,
      actor: user,
    });
  }

  /**
   * PATCH /tasks/:taskId/assign
   * Assigner / désassigner une tâche.
   */
  @Patch('tasks/:taskId/assign')
  assign(
    @CurrentUser() user: any,
    @Param('taskId') taskId: string,
    @Body() dto: AssignTaskDto,
  ) {
    return this.tasks.assignTask({
      taskId,
      assignee_id: dto.assignee_id ?? null,
      actor: user,
    });
  }

    /**
   * GET /tasks/me
   * Liste les tâches assignées à l'utilisateur connecté.
   */
  @Get('tasks/me')
  listMe(@CurrentUser() user: any, @Query() query: ListMyTasksQueryDto) {
    return this.tasks.listMyTasks({
      actorUserId: user.sub,
      query,
    });
  }

   /**
   * PATCH /tasks/:taskId/ack
   * Accuser réception: TODO -> DOING (assignee uniquement)
   */
  @Patch('tasks/:taskId/ack')
  acknowledge(@CurrentUser() user: any, @Param('taskId') taskId: string) {
    return this.tasks.acknowledgeTask({
      taskId,
      actor: user,
    });
  }

  /**
   * PATCH /tasks/:taskId/close
   * Clôturer: DOING -> DONE (assignee uniquement)
   */
  @Patch('tasks/:taskId/close')
  close(@CurrentUser() user: any, @Param('taskId') taskId: string) {
    return this.tasks.closeTask({
      taskId,
      actor: user,
    });
  }

  /**
   * PATCH /tasks/:taskId/desist
   * Désistement: TODO/DOING -> DESISTE (assignee uniquement)
   */
  @Patch('tasks/:taskId/desist')
  desist(
    @CurrentUser() user: any,
    @Param('taskId') taskId: string,
    @Body() dto: DesistTaskDto,
  ) {
    return this.tasks.desistTask({
      taskId,
      dto,
      actor: user,
    });
  }

    /**
   * PATCH /tasks/:taskId/reassign
   * Réassigner: DESISTE -> TODO (OWNER/MANAGER uniquement)
   */
  @Patch('tasks/:taskId/reassign')
  reassign(
    @CurrentUser() user: any,
    @Param('taskId') taskId: string,
    @Body() dto: ReassignTaskDto,
  ) {
    return this.tasks.reassignTask({
      taskId,
      dto,
      actor: user,
    });
  }

  /**
   * GET /tasks/:taskId
   * Récupérer une tâche par ID.
   */
  @Get('tasks/:taskId')
  getOne(
    @CurrentUser() user: any,
    @Param('taskId') taskId: string,
  ) {
    return this.tasks.getTaskById({
      taskId,
      actorUserId: user.sub,
    });
  }
}
