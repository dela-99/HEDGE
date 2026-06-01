import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { DatabaseModule } from './database/database.module';
import { MtnMomoModule } from './mtn-momo/mtn-momo.module';
import { SessionsModule } from './sessions/sessions.module';
import { UsersModule } from './users/users.module';
import { WebhookVerifierModule } from './webhooks/webhook-verifier.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/auth-service/.env'],
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    MtnMomoModule,
    UsersModule,
    SessionsModule,
    AuditModule,
    WebhookVerifierModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
