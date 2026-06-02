import { Module } from '@nestjs/common';
import { RawEventsModule } from '../raw-events/raw-events.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { NormalizationModule } from '../normalization/normalization.module';
import { SimulationService } from './simulation.service';

/**
 * SimulationModule orchestrates the replay of financial event fixtures through the pipeline.
 *
 * Imports:
 * - RawEventsModule: For storing raw financial events
 * - IngestionModule: For extracting transaction candidates
 * - NormalizationModule: For normalizing transactions to standard format
 *
 * Exports:
 * - SimulationService: Main service for fixture simulation
 */
@Module({
  imports: [RawEventsModule, IngestionModule, NormalizationModule],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}
