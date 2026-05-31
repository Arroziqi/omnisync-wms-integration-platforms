/**
 * Re-exports throttler decorators from @nestjs/throttler for consistent
 * usage across controllers without direct coupling to the library import path.
 *
 * Usage:
 *   @SkipThrottle()       — disables throttling on a controller/route
 *   @Throttle({ ... })   — overrides the default throttle limit for a route
 */
export { SkipThrottle, Throttle } from '@nestjs/throttler';
