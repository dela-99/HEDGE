import { RawEventsService } from '../raw-events/raw-events.service';
import { IngestionService, TransactionCandidate } from '../ingestion/ingestion.service';
import { NormalizationService, NormalizedTransaction } from '../normalization/normalization.service';
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
export declare class SimulationService {
    private rawEventsService;
    private ingestionService;
    private normalizationService;
    private readonly logger;
    private readonly fixturesDir;
    constructor(rawEventsService: RawEventsService, ingestionService: IngestionService, normalizationService: NormalizationService);
    simulateFixture(fixtureId: string): Promise<SimulationResult>;
    private loadFixtureData;
    private createVerifiedEvent;
    getAvailableFixtures(): string[];
}
