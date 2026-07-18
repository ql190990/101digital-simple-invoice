import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Attaches a correlation id to every request (incoming header or freshly
 * generated) and echoes it back on the response (VA-03). The id is available on
 * `request.correlationId` for downstream logging.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request & { correlationId?: string }, res: Response, next: NextFunction): void {
    const incoming = req.headers[CORRELATION_ID_HEADER];
    const correlationId = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
    req.correlationId = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  }
}
