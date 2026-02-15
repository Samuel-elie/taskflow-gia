import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  hello() {
    return { message: 'TaskFlow API is running' };
  }

  @Get('health/db')
  async dbHealth() {
    const usersCount = await this.prisma.user.count();
    return { ok: true, usersCount };
  }
}
