import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { RawEventsModule } from './raw-events/raw-events.module';
import { NormalizationModule } from './normalization/normalization.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { FraudModule } from './fraud/fraud.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SimulationModule } from './simulations/simulation.module';
import { MerchantModule } from './merchant/merchant.module';

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
    ReconciliationModule,
    FraudModule,
    AnalyticsModule,
    SimulationModule,
    MerchantModule,
  ],
})
export class AppModule {}
