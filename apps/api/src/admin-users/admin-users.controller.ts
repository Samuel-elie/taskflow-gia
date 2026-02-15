import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminUsersService } from './admin-users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private users: AdminUsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    return this.users.create({ dto, actor: user });
  }

  @Patch(':userId')
  update(@CurrentUser() user: any, @Param('userId') userId: string, @Body() dto: UpdateUserDto) {
    return this.users.update({ userId, dto, actor: user });
  }

  @Delete(':userId')
  remove(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.users.remove({ userId, actor: user });
  }
}
