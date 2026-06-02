import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { FraudModule } from '../fraud/fraud.module';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AnalyticsModule, ReconciliationModule, FraudModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
