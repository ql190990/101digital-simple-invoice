import { Controller, Get, HttpStatus, Logger, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { HealthRepository } from './health.repository';

class HealthResponse {
  @ApiProperty({
    enum: ['ok', 'degraded'],
    example: 'ok',
    description: '`ok` when the database probe succeeds, `degraded` when it fails',
  })
  status!: 'ok' | 'degraded';

  @ApiProperty({
    enum: ['up', 'down'],
    example: 'up',
    description: 'Result of the `SELECT 1` database connectivity probe',
  })
  db!: 'up' | 'down';

  @ApiProperty({ example: 12345, description: 'Process uptime in whole seconds' })
  uptime!: number;

  @ApiProperty({
    example: '2026-07-18T00:00:00.000Z',
    format: 'date-time',
    description: 'Server time when the probe ran (ISO 8601)',
  })
  timestamp!: string;
}

/**
 * Liveness/readiness probe with a real DB connectivity check (VA-02). Public so
 * orchestrators can hit it without a token. Returns 200 when healthy and 503
 * when the database is unreachable so readiness probes gate correctly (Arch M3 /
 * Sec L3); the human-readable body is preserved in both cases.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly health: HealthRepository) {}

  @Get()
  @ApiOperation({ summary: 'Service health with database connectivity check' })
  @ApiOkResponse({ description: 'Service healthy; database reachable', type: HealthResponse })
  @ApiServiceUnavailableResponse({
    description: 'Database unreachable — returns the same body with `status: degraded`',
    type: HealthResponse,
  })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded', type: ErrorResponseDto })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    let db: 'up' | 'down' = 'up';
    try {
      await this.health.ping();
    } catch (error) {
      // Don't swallow the DB error silently (CQ L5): log it so operators can see
      // why readiness is failing, then report `down` to the caller.
      db = 'down';
      this.logger.warn(
        `Database health probe failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (db === 'down') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
