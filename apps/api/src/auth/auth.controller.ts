import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { FirstPasswordDto } from './dto/first-password.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  registerPublic(@Body() body: { email: string; password: string; name?: string }) {
    return this.auth.registerPublic(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('register-by-user')
  registerByUser(@Req() req: any, @Body() body: { email: string; password: string; name?: string }) {
    return this.auth.registerByUser({
      ...body,
      creator_id: req.user.sub,
      creator_name: req.user.name,
    });
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body);
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return this.auth.refresh(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: any, @Body() body: { refreshToken: string }) {
    return this.auth.logout({
      userId: req.user.sub,
      refreshToken: body.refreshToken,
      updator_id: req.user.sub,
      updator_name: req.user.name,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return {
      user_id: req.user.sub,
      email: req.user.email,
      name: req.user.name ?? req.user.email,
      global_role: req.user.global_role ?? req.user.globalRole ?? 'USER',
      reset_password: req.user.reset_password ?? 1,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('first-password')
  async setFirstPassword(@CurrentUser() user: any, @Body() dto: FirstPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    return this.auth.setFirstPassword({
      userId: user.sub,
      password: dto.password,
    });
  }
}
