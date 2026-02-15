import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;

    // JwtAuthGuard met user dans req.user, avec global_role si tu le renvoies dans payload
    if (!user) throw new ForbiddenException('Not authenticated');

    //  on tolère `global_role` ou `globalRole` selon ton payload
    const role = user.global_role ?? user.globalRole ?? user.role ?? null;

    if (role !== 'ADMIN') throw new ForbiddenException('Admin only');
    return true;
  }
}
