import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

type JwtPayload = { sub: string; email: string; name?: string };

function getAccessSecret(): string {
  const v = process.env.JWT_ACCESS_SECRET;
  if (!v) throw new Error('JWT_ACCESS_SECRET is missing');
  return v;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: getAccessSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: { user_id: payload.sub, deleted: 0, active: 1 },
      select: { user_id: true, email: true, name: true, global_role: true, reset_password: true },
    });

    if (!user) throw new UnauthorizedException();

    return {
      sub: user.user_id,
      email: user.email,
      name: user.name ?? '',
      global_role: user.global_role,
      reset_password: user.reset_password,
    };
  }
}

