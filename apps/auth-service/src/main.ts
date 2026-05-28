import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>('app.nodeEnv') ?? 'development';
  const configuredCorsOrigins = config.get<string[]>('app.corsOrigins') ?? [];
  const httpServer = app.getHttpAdapter().getInstance();
  const corsOrigins =
    configuredCorsOrigins.length > 0
      ? configuredCorsOrigins
      : nodeEnv === 'development'
        ? ['http://localhost:3000', 'http://localhost:4200', 'http://localhost:5173']
        : [];

  if (configuredCorsOrigins.length === 0) {
    Logger.warn(
      nodeEnv === 'development'
        ? 'CORS_ORIGIN is not configured; allowing common localhost origins in development.'
        : 'CORS_ORIGIN is not configured; cross-origin requests are disabled.',
      'Bootstrap',
    );
  }

  httpServer.disable('x-powered-by');
  app.use(cookieParser());
  app.use(helmet());
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = config.get('app.port') ?? 3000;
  await app.listen(port);
}

void bootstrap();
