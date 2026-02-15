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

    const email = (dto.email ?? '').toLowerCase().trim();
    if (!email || !email.includes('@')) throw new BadRequestException('Email invalide');

    const password = (dto.password ?? '').trim();
    if (!password || password.length < 6) throw new BadRequestException('Mot de passe invalide (min 6)');

    const exists = await this.prisma.user.findFirst({ where: { email } });
    if (exists) throw new BadRequestException('Email déjà utilisé');

    const passwordHash = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        email,
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
      select: { user_id: true, global_role: true },
    });
    if (!u) throw new NotFoundException('User introuvable');

    // Normalisation email + check unicité (si on change l'email)
    let nextEmail: string | undefined = undefined;
    if (dto.email !== undefined) {
      const email = (dto.email ?? '').toLowerCase().trim();
      if (!email || !email.includes('@')) throw new BadRequestException('Email invalide');

      const exists = await this.prisma.user.findFirst({
        where: { email, user_id: { not: userId } },
        select: { user_id: true },
      });
      if (exists) throw new BadRequestException('Email déjà utilisé');

      nextEmail = email;
    }

    // Password optionnel
    let passwordHash: string | undefined = undefined;
    if (dto.password !== undefined && String(dto.password).trim()) {
      const p = String(dto.password).trim();
      if (p.length < 6) throw new BadRequestException('Mot de passe invalide (min 6)');
      passwordHash = await bcrypt.hash(p, 10);
    }

    //  Protection "dernier admin" si on tente de rétrograder ADMIN -> USER
    if (dto.global_role === 'USER' && u.global_role === 'ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: { deleted: 0, active: 1, global_role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException("Impossible : vous ne pouvez pas retirer le rôle du dernier ADMIN");
      }
    }

    return this.prisma.user.update({
      where: { user_id: userId },
      data: {
        email: nextEmail,
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
      select: { user_id: true, global_role: true },
    });
    if (!u) throw new NotFoundException('User introuvable');

    // (optionnel mais recommandé) empêcher self-delete admin
    if (actor?.sub === userId) {
      throw new BadRequestException("Impossible : vous ne pouvez pas supprimer votre propre compte");
    }

    //  Protection "dernier admin" si on supprime un admin
    if (u.global_role === 'ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: { deleted: 0, active: 1, global_role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException("Impossible : vous ne pouvez pas supprimer le dernier ADMIN");
      }
    }

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
