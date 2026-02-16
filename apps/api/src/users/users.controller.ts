import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateMeDto } from './dto/update-me.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private users: UsersService) {}

  @Patch('users/me')
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateMeDto) {
    return this.users.updateMe({ userId: user.sub, dto });
  }
}
