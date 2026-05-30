import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix (matches erd_api_docs.md — /api/v1)
  app.setGlobalPrefix('api/v1');

  // Global validation pipe — validates all DTOs automatically
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Strip unknown properties
      forbidNonWhitelisted: true, // Reject unknown properties
      transform: true,        // Auto-transform payloads to DTO class instances
    }),
  );

  // CORS — allow frontend dev server in development
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:4200',
      credentials: true,
    });
  }

  const port = process.env.PORT || process.env.API_PORT || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 OmniSync API running on: http://localhost:${port}/api/v1`,
    'Bootstrap',
  );
}

bootstrap();
