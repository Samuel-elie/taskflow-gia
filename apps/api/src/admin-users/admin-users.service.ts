import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.user.findMany({
      where: { deleted: 0, active: 1 },
      orderBy: { creation_date: 'desc' },
      select: {
        user_id: true,
        email: true,
        name: true,
        global_role: true,
        creation_date: true,
      },
    });
  }

  async create(params: { dto: any; actor: any }) {
    const { dto, actor } = params;

    const exists = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email déjà utilisé');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name?.trim() || null,
        password: passwordHash,
        global_role: dto.global_role ?? 'USER',
        creator_id: actor.sub,
        creator_name: actor.name || actor.email,
        active: 1,
        deleted: 0,
        reset_password: 0,
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

  async update(params: { userId: string; dto: any; actor: any }) {
    const { userId, dto, actor } = params;

    const u = await this.prisma.user.findFirst({
      where: { user_id: userId, deleted: 0 },
      select: { user_id: true },
    });
    if (!u) throw new NotFoundException('User introuvable');

    let passwordHash: string | undefined = undefined;
    if (dto.password) passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { user_id: userId },
      data: {
        email: dto.email ? dto.email.toLowerCase().trim() : undefined,
        name: dto.name !== undefined ? (dto.name?.trim() || null) : undefined,
        password: passwordHash ?? undefined,
        global_role: dto.global_role ?? undefined,
        updator_id: actor.sub,
        updator_name: actor.name || actor.email,
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

  async remove(params: { userId: string; actor: any }) {
    const { userId, actor } = params;

    const u = await this.prisma.user.findFirst({
      where: { user_id: userId, deleted: 0 },
      select: { user_id: true },
    });
    if (!u) throw new NotFoundException('User introuvable');

    // soft delete
    await this.prisma.user.update({
      where: { user_id: userId },
      data: {
        deleted: 1,
        active: 0,
        deleted_date: new Date(),
        deletor_id: actor.sub,
        deletor_name: actor.name || actor.email,
      },
    });

    return { ok: true };
  }
}
