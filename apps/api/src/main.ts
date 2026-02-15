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
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  //  CORS (local + Vercel)
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://taskflow-gia.vercel.app',
      'https://taskflow-gia-aeeg.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false, //  OK car tu utilises Authorization Bearer, pas cookies
  });

  //  Servir les fichiers uploadés en statique: /uploads/...
  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) mkdirSync(uploadDir);
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  //  IMPORTANT: Render/Railway utilisent process.env.PORT
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);

  console.log(`API running on port ${port}`);
}
bootstrap();
