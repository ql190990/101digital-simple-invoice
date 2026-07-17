import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

class HealthResponse {
  status!: 'ok' | 'degraded';
  db!: 'up' | 'down';
  uptime!: number;
  timestamp!: string;
}

/**
 * Liveness/readiness probe with a real DB connectivity check (VA-02). Public so
 * orchestrators can hit it without a token.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Service health with database connectivity check' })
  @ApiOkResponse({ type: HealthResponse })
  async check(): Promise<HealthResponse> {
    let db: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
