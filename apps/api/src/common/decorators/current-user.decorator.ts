import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Décorateur pour récupérer l'utilisateur authentifié depuis req.user.
 * Choix:
 * - Utiliser @Req() partout : plus simple, mais répétitif.
 * - Utiliser un décorateur : plus propre et standard NestJS.
 * Choix retenu : décorateur @CurrentUser().
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user; // Défini par JwtStrategy.validate()
  },
);
