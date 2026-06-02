import { Module } from '@nestjs/common';
import { RawEventsModule } from '../raw-events/raw-events.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { NormalizationModule } from '../normalization/normalization.module';
import { FraudModule } from '../fraud/fraud.module';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SimulationService } from './simulation.service';
import { SimulationRunnerService } from './simulation-runner.service';
import { SimulationMetricsService } from './simulation-metrics.service';
import { TransactionGeneratorService } from './generators/transaction-generator.service';
import { EdgeCaseScenarioRunner } from './edge-case-scenario-runner';
import { LoadValidationService } from './load-validation.service';

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
 * - SimulationMetricsService: Service for collecting and exporting simulation metrics
 * - TransactionGeneratorService: Service for generating realistic transaction fixtures
 * - EdgeCaseScenarioRunner: Service for executing edge-case scenarios and generating reports
 * - LoadValidationService: Service for comprehensive load validation and gate criteria checking
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
  providers: [SimulationService, SimulationRunnerService, SimulationMetricsService, TransactionGeneratorService, EdgeCaseScenarioRunner, LoadValidationService],
  exports: [SimulationService, SimulationRunnerService, SimulationMetricsService, TransactionGeneratorService, EdgeCaseScenarioRunner, LoadValidationService],
})
export class SimulationModule {}
