import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

/**
 * Converts ThrottlerException into a structured JSON 429 response
 * instead of the raw NestJS error envelope.
 */
@Catch(ThrottlerException)
export class ThrottleExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ThrottleExceptionFilter.name);

  catch(exception: ThrottlerException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ ip: string; url: string }>();

    this.logger.warn(
      `Rate limit exceeded — IP: ${request.ip} | Path: ${request.url}`,
    );

    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      error: 'Too Many Requests',
      message:
        'You have exceeded the request rate limit. Please wait before retrying.',
      retryAfter: '60s',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
