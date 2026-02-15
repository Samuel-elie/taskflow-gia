import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is missing in .env`);
  return v;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  private ACCESS_EXPIRES_SECONDS = 15 * 60;
  private REFRESH_EXPIRES_SECONDS = 7 * 24 * 60 * 60;

  private signAccessToken(payload: { sub: string; email: string; name: string }) {
    return this.jwt.sign(payload, {
      secret: envOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.ACCESS_EXPIRES_SECONDS,
    });
  }

  private signRefreshToken(payload: { sub: string; email: string; name: string }) {
    return this.jwt.sign(payload, {
      secret: envOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.REFRESH_EXPIRES_SECONDS,
    });
  }

  async registerPublic(params: { email: string; password: string; name?: string }) {
    const exists = await this.prisma.user.findFirst({
      where: { email: params.email, deleted: 0 },
    });
    if (exists) throw new BadRequestException('User already exists');

    const passwordHash = await bcrypt.hash(params.password, 10);

    return this.prisma.user.create({
      data: {
        email: params.email,
        name: params.name,
        password: passwordHash,
        reset_password: 1, // user créé "normal" => déjà OK
        creator_id: 'SYSTEM',
        creator_name: 'SYSTEM',
        active: 1,
        deleted: 0,
      },
      select: { user_id: true, email: true, name: true },
    });
  }

  async registerByUser(params: {
    email: string;
    password: string;
    name?: string;
    creator_id: string;
    creator_name: string;
  }) {
    const exists = await this.prisma.user.findFirst({
      where: { email: params.email, deleted: 0 },
    });
    if (exists) throw new BadRequestException('User already exists');

    const passwordHash = await bcrypt.hash(params.password, 10);

    return this.prisma.user.create({
      data: {
        email: params.email,
        name: params.name,
        password: passwordHash,
        reset_password: 0, // ✅ créé par admin => doit changer au 1er login
        creator_id: params.creator_id,
        creator_name: params.creator_name,
        active: 1,
        deleted: 0,
      },
      select: { user_id: true, email: true, name: true },
    });
  }

  async login(params: { email: string; password: string }) {
    const user = await this.prisma.user.findFirst({
      where: { email: params.email, deleted: 0, active: 1 },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(params.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.user_id, email: user.email, name: user.name ?? '' };

    const accessToken = this.signAccessToken(payload);
    const refreshToken = this.signRefreshToken(payload);

    await this.prisma.refreshToken.create({
      data: {
        user_id: user.user_id,
        token_hash: sha256(refreshToken),
        revoked: 0,
        expires_at: new Date(Date.now() + this.REFRESH_EXPIRES_SECONDS * 1000),
        creator_id: user.user_id,
        creator_name: user.name ?? user.email,
        active: 1,
        deleted: 0,
      },
    });

    return { accessToken, refreshToken };
  }

  async refresh(params: { refreshToken: string }) {
    let payload: any;

    try {
      payload = this.jwt.verify(params.refreshToken, {
        secret: envOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = payload.sub as string;

    const user = await this.prisma.user.findFirst({
      where: { user_id: userId, deleted: 0, active: 1 },
    });
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    const tokenRow = await this.prisma.refreshToken.findFirst({
      where: {
        user_id: userId,
        token_hash: sha256(params.refreshToken),
        revoked: 0,
        deleted: 0,
        active: 1,
      },
    });
    if (!tokenRow) throw new UnauthorizedException('Invalid refresh token');

    const newPayload = { sub: user.user_id, email: user.email, name: user.name ?? '' };
    const newAccessToken = this.signAccessToken(newPayload);

    return { accessToken: newAccessToken };
  }

  async logout(params: {
    userId: string;
    refreshToken: string;
    updator_id: string;
    updator_name: string;
  }) {
    await this.prisma.refreshToken.updateMany({
      where: {
        user_id: params.userId,
        token_hash: sha256(params.refreshToken),
        revoked: 0,
        deleted: 0,
      },
      data: {
        revoked: 1,
        updator_id: params.updator_id,
        updator_name: params.updator_name,
      },
    });

    return { ok: true };
  }

  async setFirstPassword(params: { userId: string; password: string }) {
    const { userId, password } = params;

    const u = await this.prisma.user.findFirst({
      where: { user_id: userId, deleted: 0, active: 1 },
      select: { user_id: true, reset_password: true },
    });

    if (!u) throw new ForbiddenException('Accès refusé');

    if (u.reset_password === 1) {
      return { ok: true, alreadyDone: true };
    }

    const hash = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { user_id: userId },
      data: {
        password: hash,
        reset_password: 1,
        updator_id: userId,
        updator_name: 'SELF',
      },
    });

    return { ok: true };
  }
}
