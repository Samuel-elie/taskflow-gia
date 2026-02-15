import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  //  Validation globale des DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // supprime les champs inconnus
      transform: true, // transforme les types (string -> number)
      forbidNonWhitelisted: false,
    }),
  );

  //  CORS pour le frontend local
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: false, // pas de cookies pour l'instant
  });

  //  Servir les fichiers uploadés en statique: /uploads/...
  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) mkdirSync(uploadDir);

  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 3001;
  await app.listen(port);

  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
