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

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.correlationId ?? '-'}] ${request.method} ${request.url} → ${statusCode}: ${
          Array.isArray(message) ? message.join('; ') : message
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );
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
        return { statusCode: status, message: res, error: exception.name };
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
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Database request error',
      error: 'Bad Request',
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
