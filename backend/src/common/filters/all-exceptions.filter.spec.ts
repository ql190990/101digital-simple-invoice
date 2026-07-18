import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { AllExceptionsFilter } from './all-exceptions.filter';

type Envelope = { statusCode: number; message: string | string[]; error: string };

/**
 * Builds a mock ArgumentsHost whose Response captures the status/body the filter
 * writes, so each branch can be asserted without a running HTTP server (Test H4).
 */
function createHost(): {
  host: ArgumentsHost;
  status: jest.Mock;
  json: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const response = { status } as unknown as Response;
  const request = { method: 'GET', url: '/invoices/123', correlationId: 'cid-test' };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(`prisma ${code}`, {
    code,
    clientVersion: 'test',
  });
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    filter = new AllExceptionsFilter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps an HttpException to its status and message, warning on 4xx', () => {
    const { host, status, json } = createHost();

    filter.catch(new NotFoundException('Invoice not found'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json.mock.calls[0][0]).toEqual({
      statusCode: 404,
      message: 'Invoice not found',
      error: 'Not Found',
    });
    // Client errors are audit-logged at warn (CICD M-5), never at error.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('cid-test');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('derives the error phrase from the status for a string-bodied HttpException (CQ L12)', () => {
    const { host, json } = createHost();

    filter.catch(new HttpException('Custom string message', HttpStatus.BAD_REQUEST), host);

    // error is the reason phrase, not the exception class name ("HttpException").
    expect(json.mock.calls[0][0]).toEqual({
      statusCode: 400,
      message: 'Custom string message',
      error: 'Bad Request',
    });
  });

  it('maps a Prisma P2002 (unique constraint) to 409 Conflict', () => {
    const { host, status, json } = createHost();

    filter.catch(prismaError('P2002'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json.mock.calls[0][0]).toEqual({
      statusCode: 409,
      message: 'A record with the same unique value already exists',
      error: 'Conflict',
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('maps a Prisma P2025 (record not found) to 404 Not Found', () => {
    const { host, status, json } = createHost();

    filter.catch(prismaError('P2025'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json.mock.calls[0][0]).toEqual({
      statusCode: 404,
      message: 'Record not found',
      error: 'Not Found',
    });
  });

  it('maps an unknown Prisma code to a generic 500 and logs at error', () => {
    const { host, status, json } = createHost();

    filter.catch(prismaError('P2003'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json.mock.calls[0][0]).toEqual({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
    // No P2003 detail leaks to the client.
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('P2003');
    // Server-side faults are logged at error with the correlation id (CQ M1 / Sec L1).
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('cid-test');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('maps a raw Error to a generic 500 without leaking its message, logging the stack', () => {
    const { host, status, json } = createHost();

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = json.mock.calls[0][0] as Envelope;
    expect(body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
    // The internal detail 'boom' must never reach the response body.
    expect(JSON.stringify(body)).not.toContain('boom');
    // Logged at error with the stack trace as the second argument.
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(typeof errorSpy.mock.calls[0][1]).toBe('string');
  });
});
