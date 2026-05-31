import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, originalUrl } = request;
    const userAgent = request.get('user-agent') || '-';
    const startTime = Date.now();

    response.on('finish', () => {
      const { statusCode } = response;
      const duration = Date.now() - startTime;

      // Color-code HTTP Method
      let methodColor = '\x1b[37m'; // White
      if (method === 'GET') methodColor = '\x1b[32m'; // Green
      else if (method === 'POST') methodColor = '\x1b[33m'; // Yellow
      else if (method === 'PUT' || method === 'PATCH') methodColor = '\x1b[34m'; // Blue
      else if (method === 'DELETE') methodColor = '\x1b[31m'; // Red
      const coloredMethod = `${methodColor}${method}\x1b[0m`;

      // Color-code HTTP Status Code
      let statusColor = '\x1b[32m'; // Green (2xx)
      if (statusCode >= 500) statusColor = '\x1b[31m\x1b[1m'; // Bold Red (5xx)
      else if (statusCode >= 400) statusColor = '\x1b[33m'; // Yellow (4xx)
      else if (statusCode >= 300) statusColor = '\x1b[36m'; // Cyan (3xx)
      const coloredStatus = `${statusColor}${statusCode}\x1b[0m`;

      // Color-code Duration
      let durationColor = '\x1b[32m'; // Green (<100ms)
      if (duration > 1000) durationColor = '\x1b[31m'; // Red (>1000ms)
      else if (duration > 500) durationColor = '\x1b[33m'; // Yellow (>500ms)
      const coloredDuration = `${durationColor}${duration}ms\x1b[0m`;

      const message = `${coloredMethod} ${originalUrl} ${coloredStatus} - ${coloredDuration} - ${userAgent} [${ip}]`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
