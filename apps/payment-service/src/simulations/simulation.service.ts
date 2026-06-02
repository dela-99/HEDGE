import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { RawEventsService } from '../raw-events/raw-events.service';
import { IngestionService, TransactionCandidate, VerifiedEvent } from '../ingestion/ingestion.service';
import { NormalizationService, NormalizedTransaction } from '../normalization/normalization.service';

/**
 * Simulation result capturing the outcome of replaying a fixture through the pipeline.
 */
export interface SimulationResult {
  fixtureId: string;
  provider: string;
  status: 'success' | 'failure';
  rawEventId?: string;
  ingestedCandidate?: TransactionCandidate;
  normalizedTransaction?: NormalizedTransaction;
  errors: string[];
  executedAt: Date;
}

/**
 * Fixture payload structure - defines the contract for fixture JSON files.
 */
interface FixturePayload {
  provider: string;
  eventType: string;
  providerReference: string;
  receivedAt?: string;
  payloadJson: Record<string, any>;
  headersJson?: Record<string, any>;
}

/**
 * SimulationService orchestrates the replay of financial event fixtures through the pipeline.
 *
 * Responsibilities:
 * - Load fixture data from JSON files
 * - Simulate webhook verification (mark events as verified)
 * - Coordinate fixture replay through ingestion and normalization layers
 * - Collect and report results and errors
 * - Support extensible fixture-based testing
 *
 * Does NOT:
 * - Bypass verification layer (simulates verification by marking as verified)
 * - Bypass ingestion layer
 * - Bypass normalization layer
 *
 * Every fixture travels through the same path as a real webhook.
 */
@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);
  private readonly fixturesDir = path.join(__dirname, 'fixtures');

  constructor(
    private rawEventsService: RawEventsService,
    private ingestionService: IngestionService,
    private normalizationService: NormalizationService,
  ) {}

  /**
   * Simulate a financial event by replaying a fixture through the pipeline.
   *
   * @param fixtureId - The fixture file name without .json extension (e.g., 'successful-payment')
   * @returns SimulationResult with pipeline results and any errors encountered
   */
  async simulateFixture(fixtureId: string): Promise<SimulationResult> {
    const result: SimulationResult = {
      fixtureId,
      provider: '',
      status: 'failure',
      errors: [],
      executedAt: new Date(),
    };

    try {
      // Load fixture data
      const fixtureData = this.loadFixtureData(fixtureId);
      result.provider = fixtureData.provider;

      // Step 1: Simulate verification and store raw event
      const verifiedEvent = this.createVerifiedEvent(fixtureData);
      const rawEvent = await this.rawEventsService.storeEvent({
        provider: verifiedEvent.provider,
        eventType: fixtureData.eventType,
        providerReference: verifiedEvent.providerReference,
        headersJson: verifiedEvent.headersJson,
        payloadJson: verifiedEvent.payloadJson,
        receivedAt: verifiedEvent.receivedAt,
        verificationStatus: 'verified', // Simulate successful verification
      });

      result.rawEventId = rawEvent.id;
      this.logger.debug(`Raw event stored: ${rawEvent.id}`);

      // Step 2: Ingest the verified event
      const ingestionResult = this.ingestionService.ingest(verifiedEvent);
      result.ingestedCandidate = ingestionResult.candidate;
      this.logger.debug(`Transaction ingested: ${ingestionResult.candidate.id}`);

      // Step 3: Normalize the transaction
      const normalizedTransaction = this.normalizationService.normalize(
        fixtureData.provider,
        fixtureData.payloadJson,
      );
      result.normalizedTransaction = normalizedTransaction;
      this.logger.debug(`Transaction normalized for provider: ${fixtureData.provider}`);

      // All steps completed successfully
      result.status = 'success';
      this.logger.log(`Fixture simulation successful: ${fixtureId}`);
    } catch (error) {
      result.status = 'failure';
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      this.logger.error(`Fixture simulation failed: ${fixtureId}`, errorMessage);
    }

    return result;
  }

  /**
   * Load fixture data from a JSON file.
   *
   * @param fixtureId - The fixture file name without .json extension
   * @returns Parsed fixture payload
   * @throws BadRequestException if fixture not found or invalid
   */
  private loadFixtureData(fixtureId: string): FixturePayload {
    const fixtureFilePath = path.join(this.fixturesDir, `${fixtureId}.json`);

    try {
      const fileContent = fs.readFileSync(fixtureFilePath, 'utf-8');
      const data = JSON.parse(fileContent) as FixturePayload;

      // Validate required fields
      if (!data.provider) {
        throw new BadRequestException('Fixture must have provider field');
      }
      if (!data.providerReference) {
        throw new BadRequestException('Fixture must have providerReference field');
      }
      if (!data.payloadJson || typeof data.payloadJson !== 'object') {
        throw new BadRequestException('Fixture must have payloadJson field');
      }
      if (!data.eventType) {
        throw new BadRequestException('Fixture must have eventType field');
      }

      return data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to load fixture '${fixtureId}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create a VerifiedEvent from fixture data.
   * This simulates successful webhook verification.
   *
   * @param fixtureData - The loaded fixture payload
   * @returns VerifiedEvent ready for ingestion
   */
  private createVerifiedEvent(fixtureData: FixturePayload): VerifiedEvent {
    return {
      id: `sim:${fixtureData.provider}:${fixtureData.providerReference}:${Date.now()}`,
      provider: fixtureData.provider,
      providerReference: fixtureData.providerReference,
      payloadJson: fixtureData.payloadJson,
      headersJson: fixtureData.headersJson || {},
      receivedAt: fixtureData.receivedAt ? new Date(fixtureData.receivedAt) : new Date(),
      verificationStatus: 'verified',
    };
  }

  /**
   * Get list of available fixture files.
   * Useful for discovering what simulations are available.
   *
   * @returns Array of fixture IDs (file names without .json)
   */
  getAvailableFixtures(): string[] {
    try {
      const files = fs.readdirSync(this.fixturesDir);
      return files
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace('.json', ''));
    } catch (error) {
      this.logger.warn('Failed to list fixtures:', error);
      return [];
    }
  }
}
