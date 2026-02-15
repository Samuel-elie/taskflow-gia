import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AttachmentsService } from './attachments.service';

function safeName(original: string) {
  const base = original.replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.length > 120 ? base.slice(-120) : base;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class AttachmentsController {
  constructor(private attachments: AttachmentsService) {}

  /**
   * POST /tasks/:taskId/attachments
   * Upload fichier (stockage local /uploads)
   * FormData: file=<FILE>
   */
  @Post('tasks/:taskId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const id = Date.now().toString(36);
          const ext = extname(file.originalname);
          const nameNoExt = file.originalname.replace(ext, '');
          cb(null, `${id}-${safeName(nameNoExt)}${ext}`);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    }),
  )
  upload(
    @CurrentUser() user: any,
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Fichier manquant. Utilise FormData key="file".');
    }

    return this.attachments.create({
      taskId,
      file,
      actor: user,
    });
  }

  /**
   * GET /tasks/:taskId/attachments
   */
  @Get('tasks/:taskId/attachments')
  list(@CurrentUser() user: any, @Param('taskId') taskId: string) {
    return this.attachments.list({ taskId, actorUserId: user.sub });
  }

  /**
   * DELETE /attachments/:attachmentId
   * Soft delete
   */
  @Delete('attachments/:attachmentId')
  remove(@CurrentUser() user: any, @Param('attachmentId') attachmentId: string) {
    return this.attachments.remove({ attachmentId, actor: user });
  }
}
