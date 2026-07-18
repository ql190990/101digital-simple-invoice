import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Owns the database connectivity probe for the health endpoint so the controller
 * never imports PrismaService directly — keeping the "only repositories touch
 * Prisma" layering invariant intact (ADR D2 / Arch M1).
 */
@Injectable()
export class HealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs a trivial `SELECT 1`. Resolves when the database is reachable and
   * rejects (throws) when it is not, so the caller can flip health to `down`.
   */
  async ping(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
