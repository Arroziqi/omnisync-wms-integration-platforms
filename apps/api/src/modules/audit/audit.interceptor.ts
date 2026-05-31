import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AuditStatus } from '../../database/entities/audit-log.entity';
import { AUDIT_ACTION_KEY } from './audit.decorator';

/**
 * AuditInterceptor
 *
 * Automatically writes an audit log entry for any controller method
 * decorated with @Audit('action.name').
 *
 * Extracts actor identity from the JWT-populated req.user, captures the
 * client IP address and User-Agent, and records success or failure outcome.
 *
 * Usage: Apply at method or controller level alongside @Audit():
 *
 *   @Audit('user.login')
 *   @UseInterceptors(AuditInterceptor)
 *   @Post('login')
 *   async login(...) { ... }
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<string>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    // Only audit if the @Audit() decorator is present
    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<any>();
    const user = request.user as { userId?: string; email?: string } | undefined;

    // Extract client IP (support X-Forwarded-For for proxy/nginx environments)
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      null;

    const userAgent = (request.headers['user-agent'] as string) || null;

    return next.handle().pipe(
      tap(async () => {
        await this.auditService.log({
          actorId: user?.userId ?? null,
          actorEmail: user?.email ?? null,
          action,
          ipAddress,
          userAgent,
          status: AuditStatus.SUCCESS,
        });
      }),
      catchError((err) => {
        // Log the failure audit entry, then re-throw so NestJS handles it normally
        this.auditService.log({
          actorId: user?.userId ?? null,
          actorEmail: user?.email ?? null,
          action,
          ipAddress,
          userAgent,
          status: AuditStatus.FAILURE,
          errorMessage: err?.message ?? String(err),
        });
        return throwError(() => err);
      }),
    );
  }
}
