import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit:action';

/**
 * @Audit('action.name')
 *
 * Decorates a controller method with an audit action label.
 * The AuditInterceptor reads this metadata to determine what to log.
 *
 * @example
 * @Audit('user.login')
 * @Post('login')
 * async login(@Body() dto: LoginDto) { ... }
 */
export const Audit = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);
