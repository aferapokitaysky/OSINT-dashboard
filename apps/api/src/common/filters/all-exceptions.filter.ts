import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { RequestWithCorrelationId } from '../middleware/correlation-id.middleware';

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
};

// Every error response — validation failures, RBAC denials, provider
// errors, uncaught bugs — comes out the same shape:
// { error: { code, message, details, correlationId } }.
// See coordination/api-contract.md "Все ошибки".
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithCorrelationId>();
    const correlationId = request?.correlationId;

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const code = STATUS_CODES[status] ?? 'INTERNAL_SERVER_ERROR';

    let message = 'Internal server error';
    let details: unknown[] = [];

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        if (Array.isArray(b.errors)) {
          // ZodValidationPipe's { message: 'Validation failed', errors: ZodIssue[] }
          message = typeof b.message === 'string' ? b.message : 'Validation failed';
          details = b.errors;
        } else if (Array.isArray(b.message)) {
          // class-validator's default { message: string[] }
          message = 'Validation failed';
          details = b.message;
        } else {
          message = typeof b.message === 'string' ? b.message : exception.message;
        }
      }
    } else if (exception instanceof Error) {
      message = 'Internal server error';
    }

    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`[${correlationId ?? '-'}] ${message}`, stack);
    }

    response.status(status).json({
      error: { code, message, details, correlationId },
    });
  }
}
