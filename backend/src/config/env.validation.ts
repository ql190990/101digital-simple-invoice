import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
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
  @MinLength(32, {
    message: 'JWT_SECRET must be at least 32 characters. Set a long random string.',
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

  // Gates the Swagger UI / OpenAPI schema (Sec M5). Kept ON by default so the
  // Docker demo still exposes /api/docs; set ENABLE_SWAGGER=false to hide it in
  // a real deployment. `@Type(() => String)` keeps the raw env string intact so
  // `enableImplicitConversion` cannot pre-coerce 'false' to a truthy boolean
  // before the transform below normalises it.
  @Type(() => String)
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  ENABLE_SWAGGER = true;
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

  // Soft guard (Sec H1): the committed compose default secret must never protect
  // a real deployment. We warn rather than throw so the one-command demo keeps
  // booting; a real deployment is expected to set its own JWT_SECRET.
  if (validated.NODE_ENV === NodeEnv.Production && validated.JWT_SECRET.includes('please_change')) {
    // eslint-disable-next-line no-console
    console.warn(
      '[SECURITY] JWT_SECRET is the demo placeholder — set a real secret for any real deployment',
    );
  }

  return validated;
}
