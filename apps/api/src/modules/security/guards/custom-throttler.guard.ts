import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    // Gracefully bypass throttling in dev, tests, or when bypass flag is active
    if (
      process.env.NODE_ENV !== 'production' ||
      process.env.BYPASS_THROTTLE === 'true' ||
      process.env.THROTTLE_LIMIT === '100000'
    ) {
      return true;
    }

    return super.canActivate(context);
  }
}
