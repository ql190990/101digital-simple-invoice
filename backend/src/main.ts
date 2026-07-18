import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  // Trust the single nginx hop so ThrottlerGuard keys on the real client IP from
  // X-Forwarded-For instead of the proxy's container IP (Sec M6).
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security headers (AUTH-10).
  app.use(helmet());

  // CORS allow-list from env (AUTH-10). When served behind the nginx proxy the
  // browser uses a same-origin relative URL, so CORS is effectively unused there.
  // Fail closed: deny cross-origin when no allow-list is configured (Sec L2).
  const corsOrigins = config
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
  });

  // NOTE (ADR A2): NO global '/api' prefix. Routes are /auth/*, /invoices, etc.
  // The global ValidationPipe (D8/ERR-01) lives in AppModule as an APP_PIPE (BP-L2).
  // Swagger is mounted at /api/docs independently below, gated by ENABLE_SWAGGER (Sec M5).
  if (config.get<boolean>('ENABLE_SWAGGER')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SimpleInvoice API')
      .setDescription('REST API for the SimpleInvoice application (101 Digital assessment)')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // Flush in-flight requests and close the DB pool on SIGTERM/SIGINT (BP-M4).
  app.enableShutdownHooks();

  const port = config.get<number>('BACKEND_PORT', 3000);
  await app.listen(port, '0.0.0.0');
  const swaggerNote = config.get<boolean>('ENABLE_SWAGGER') ? ' (Swagger at /api/docs)' : '';
  new Logger('Bootstrap').log(`SimpleInvoice API listening on :${port}${swaggerNote}`);
}

void bootstrap();
