import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { RawEventsModule } from './raw-events/raw-events.module';
import { NormalizationModule } from './normalization/normalization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/payment-service/.env'],
      load: [configuration],
    }),
    DatabaseModule,
    RawEventsModule,
    IngestionModule,
    NormalizationModule,
  ],
})
export class AppModule {}
