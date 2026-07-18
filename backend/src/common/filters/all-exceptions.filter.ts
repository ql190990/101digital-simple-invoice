import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

/**
 * Standard error envelope (ERR-02):
 *   { "statusCode": number, "message": string | string[], "error": string }
 *
 * A single global filter produces this shape for every non-validation error.
 * Nest's ValidationPipe already emits the 400 envelope with a `message` array,
 * which we preserve as-is here.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();

    const { statusCode, message, error } = this.resolve(exception);
    const cid = request.correlationId ?? '-';
    const flatMessage = Array.isArray(message) ? message.join('; ') : message;
    const line = `[${cid}] ${request.method} ${request.url} → ${statusCode}: ${flatMessage}`;

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Server-side faults — including unmapped Prisma codes (P2003/P2000/P2010/
      // P2024/…) and generic Errors, both mapped to 500 — are logged with the
      // correlation id and stack so nothing is swallowed (CQ M1 / Sec L1).
      this.logger.error(line, exception instanceof Error ? exception.stack : undefined);
    } else if (statusCode >= HttpStatus.BAD_REQUEST) {
      // Client errors (401/403/404/409/429/…) leave an audit trail for failed
      // logins and throttle hits (CICD M-5 / security observability).
      this.logger.warn(line);
    }

    response.status(statusCode).json({ statusCode, message, error });
  }

  private resolve(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        // Use the HTTP reason phrase, not the exception class name (CQ L12).
        return { statusCode: status, message: res, error: this.reasonPhrase(status) };
      }
      const body = res as { message?: string | string[]; error?: string };
      return {
        statusCode: status,
        message: body.message ?? exception.message,
        error: body.error ?? this.reasonPhrase(status),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrisma(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }

  private resolvePrisma(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    error: string;
  } {
    // P2002 = unique constraint violation. Map to 409 (ADR A10).
    if (exception.code === 'P2002') {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'A record with the same unique value already exists',
        error: 'Conflict',
      };
    }
    // P2025 = record not found.
    if (exception.code === 'P2025') {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Record not found',
        error: 'Not Found',
      };
    }
    // Any other Prisma code (P2003 FK violation, P2000 value too long, P2010 raw
    // query failed, P2024 pool timeout, …) is a server-side fault, not a client
    // error — surface a generic 500 (logged at `error` above) and never leak the
    // underlying DB detail in the response body (CQ M1 / Sec L1).
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }

  private reasonPhrase(status: number): string {
    const map: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
    };
    return map[status] ?? 'Error';
  }
}
