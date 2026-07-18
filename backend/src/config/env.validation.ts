import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Schema-validated environment (ADR D4). The application fails fast at boot if
 * any required variable is missing or malformed.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  BACKEND_PORT = 3000;

  @IsString()
  @MinLength(16, {
    message: 'JWT_SECRET must be at least 16 characters. Set a long random string.',
  })
  JWT_SECRET!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  JWT_EXPIRES_IN = 3600;

  @IsString()
  @IsOptional()
  APP_TIMEZONE = 'UTC';

  @IsString()
  @IsOptional()
  CORS_ORIGINS = 'http://localhost:5173,http://localhost:8080';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  MAX_PAGE_SIZE = 100;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  THROTTLE_TTL = 60;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT = 100;
}

/**
 * Coerces and validates raw `process.env` into a typed config object.
 * Used by `ConfigModule.forRoot({ validate })`.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const details = errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }

  return validated;
}
