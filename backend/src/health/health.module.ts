import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthRepository } from './health.repository';

// PrismaModule is @Global, so PrismaService is injectable into HealthRepository
// without an explicit import here (consistent with the other feature modules).
@Module({
  controllers: [HealthController],
  providers: [HealthRepository],
})
export class HealthModule {}
