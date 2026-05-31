import { Global, Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { throttlerConfigFactory } from './throttler.config';
import { SecurityHeadersInterceptor } from './interceptors/security-headers.interceptor';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';

/**
 * SecurityModule — Global module that bundles all cross-cutting security concerns:
 *
 *  1. ThrottlerModule  — global rate limiting (100 req / 60 s per IP by default)
 *  2. ThrottlerGuard   — applied globally via APP_GUARD so every route is protected
 *  3. SecurityHeadersInterceptor — adds cache-control + security headers to responses
 *
 * Import this module once in AppModule. Individual routes can opt out with
 * @SkipThrottle() or override limits with @Throttle({ ... }).
 */
@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: throttlerConfigFactory,
    }),
  ],
  providers: [
    // Apply throttler globally — protects every registered route
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    // Apply security response headers globally
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityHeadersInterceptor,
    },
  ],
  exports: [ThrottlerModule],
})
export class SecurityModule {}
