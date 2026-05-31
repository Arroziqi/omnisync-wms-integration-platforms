import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Throttler configuration factory.
 * Reads THROTTLE_TTL and THROTTLE_LIMIT from environment (via ConfigService).
 *
 * Defaults:
 *  - TTL:   60 seconds
 *  - Limit: 100 requests per TTL window per IP
 */
export const throttlerConfigFactory = (
  config: ConfigService,
): ThrottlerModuleOptions => ({
  throttlers: [
    {
      name: 'default',
      ttl: config.get<number>('THROTTLE_TTL', 60) * 1000, // ms
      limit: config.get<number>(
        'THROTTLE_LIMIT',
        process.env.NODE_ENV !== 'production' ? 100000 : 100
      ),
    },
  ],
});
