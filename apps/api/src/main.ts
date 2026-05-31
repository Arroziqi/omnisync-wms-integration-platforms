import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadDockerSecrets } from './config/secrets.loader';

// Load Docker file-based secrets into process.env before initialization
loadDockerSecrets();

import { AppModule } from './app/app.module';
import { PrettyLogger } from './modules/logger/pretty-logger.service';
import helmet from 'helmet';
import { ThrottleExceptionFilter } from './modules/security/guards/throttle-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new PrettyLogger(),
  });

  // ─────────────────────────────────────────────────────────────────
  // Helmet — sets 11+ security-related HTTP headers automatically:
  //  • Content-Security-Policy
  //  • Strict-Transport-Security (HSTS)
  //  • X-Frame-Options: SAMEORIGIN
  //  • X-Content-Type-Options: nosniff
  //  • X-XSS-Protection
  //  • Referrer-Policy
  //  • Cross-Origin-* policies
  // ─────────────────────────────────────────────────────────────────
  app.use(
    helmet({
      // HSTS: tell browsers to always use HTTPS for 1 year (ONLY in production to prevent localhost HSTS loops)
      hsts: process.env.NODE_ENV === 'production' ? {
        maxAge: 31_536_000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
      } : false,
      // CSP: restrict resource origins — tighten further per environment if needed
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // allow embedded resources for the dashboard
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow cross-origin resources (e.g. for fetch)
    }),
  );

  // Global API prefix (matches erd_api_docs.md — /api/v1)
  app.setGlobalPrefix('api/v1');

  // ─────────────────────────────────────────────────────────────────
  // Global validation pipe — validates all DTOs automatically
  // ─────────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // Strip unknown properties
      forbidNonWhitelisted: true,  // Reject requests with unknown properties (400)
      transform: true,             // Auto-transform payloads to DTO class instances
      stopAtFirstError: true,      // Fail fast — return only the first error per field
    }),
  );

  // ─────────────────────────────────────────────────────────────────
  // Throttler exception filter — returns structured JSON on 429
  // (registered here to ensure it fires before other filters)
  // ─────────────────────────────────────────────────────────────────
  app.useGlobalFilters(new ThrottleExceptionFilter());

  // ─────────────────────────────────────────────────────────────────
  // CORS — strict production config, permissive in development
  // ─────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({
      origin: process.env.FRONTEND_URL || [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:4200',
        'http://127.0.0.1:4200'
      ],
      credentials: true,
    });
  } else {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    app.enableCors({
      origin: allowedOrigins.length ? allowedOrigins : false,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
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
