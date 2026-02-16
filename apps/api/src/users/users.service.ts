import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async updateMe(params: { userId: string; dto: any }) {
    const { userId, dto } = params;

    const u = await this.prisma.user.findFirst({
      where: { user_id: userId, deleted: 0 },
      select: { user_id: true, email: true },
    });
    if (!u) throw new NotFoundException('User introuvable');

    if (dto.email) {
      const nextEmail = dto.email.toLowerCase().trim();
      const exists = await this.prisma.user.findFirst({
        where: { email: nextEmail, user_id: { not: userId } },
        select: { user_id: true },
      });
      if (exists) throw new BadRequestException('Email déjà utilisé');
    }

    let passwordHash: string | undefined = undefined;
    if (dto.password) passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { user_id: userId },
      data: {
        email: dto.email ? dto.email.toLowerCase().trim() : undefined,
        name: dto.name !== undefined ? (dto.name?.trim() || null) : undefined,
        password: passwordHash ?? undefined,
      },
      select: {
        user_id: true,
        email: true,
        name: true,
        global_role: true,
        creation_date: true,
      },
    });
  }
}
