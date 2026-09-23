import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * SPEC §2.5: every endpoint returns `{ error: string }` (a Thai message) with
 * a plain HTTP status — no separate error-code scheme, no Nest's default
 * `{ statusCode, message, error }` shape. This filter is the one place that
 * translates any thrown exception into that contract.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
      res
        .status(status)
        .json({ error: Array.isArray(message) ? message.join(', ') : message });
      return;
    }

    // eslint-disable-next-line no-console
    console.error(exception);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด' });
  }
}
