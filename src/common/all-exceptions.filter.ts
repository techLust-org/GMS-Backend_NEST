import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

// Reproduces middleware/errorHandler.js + the app.js 404 fallback.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error(exception);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // Guards like ActiveShopGuard already emit a full envelope (with `code`).
      if (body && typeof body === 'object' && 'success' in (body as any)) {
        return res.status(status).json(body);
      }

      let message =
        typeof body === 'string'
          ? body
          : (body as any)?.message ?? 'Error';
      if (Array.isArray(message)) message = message[0];

      // Unmatched route → Nest's default NotFoundException message is
      // "Cannot <METHOD> <path>"; the Express app returned "Route not found".
      if (status === 404 && typeof message === 'string' && /^Cannot\s+\w+\s+/.test(message)) {
        message = 'Route not found';
      }

      return res.status(status).json({ success: false, message });
    }

    // Non-operational / unexpected error → mirror errorHandler.js.
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
