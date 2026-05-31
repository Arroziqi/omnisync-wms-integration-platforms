import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

/**
 * Adds security-relevant response headers to every API response:
 *
 *  - Cache-Control: no-store              — prevents sensitive data caching
 *  - Pragma: no-cache                     — legacy HTTP/1.0 cache control
 *  - X-Content-Type-Options: nosniff      — MIME-type sniffing prevention
 *  - X-DNS-Prefetch-Control: off          — disables DNS prefetching
 *
 * Helmet handles the rest (CSP, HSTS, X-Frame-Options, etc.) in main.ts.
 */
@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('X-DNS-Prefetch-Control', 'off');
      }),
    );
  }
}
