import { Module } from '@nestjs/common';
import { RawEventsModule } from '../raw-events/raw-events.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { NormalizationModule } from '../normalization/normalization.module';
import { FraudModule } from '../fraud/fraud.module';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SimulationService } from './simulation.service';
import { SimulationRunnerService } from './simulation-runner.service';

/**
 * SimulationModule orchestrates the replay of financial event fixtures and generated events through the pipeline.
 *
 * Imports:
 * - RawEventsModule: For storing raw financial events
 * - IngestionModule: For extracting transaction candidates
 * - NormalizationModule: For normalizing transactions to standard format
 * - FraudModule: For fraud signal detection
 * - ReconciliationModule: For reconciliation classification
 * - AnalyticsModule: For metrics aggregation
 *
 * Exports:
 * - SimulationService: Service for fixture-based simulation
 * - SimulationRunnerService: Service for replaying generated events through the full pipeline
 */
@Module({
  imports: [
    RawEventsModule,
    IngestionModule,
    NormalizationModule,
    FraudModule,
    ReconciliationModule,
    AnalyticsModule,
  ],
  providers: [SimulationService, SimulationRunnerService],
  exports: [SimulationService, SimulationRunnerService],
})
export class SimulationModule {}
