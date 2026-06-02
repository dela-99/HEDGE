import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService } from '../simulation.service';
import { RawEventsService } from '../../raw-events/raw-events.service';
import { IngestionService } from '../../ingestion/ingestion.service';
import { NormalizationService } from '../../normalization/normalization.service';

describe('SimulationService', () => {
  let service: SimulationService;
  let mockRawEventsService: jest.Mocked<RawEventsService>;
  let mockIngestionService: jest.Mocked<IngestionService>;
  let mockNormalizationService: jest.Mocked<NormalizationService>;

  beforeEach(async () => {
    // Create mock services
    mockRawEventsService = {
      storeEvent: jest.fn(),
      findByProviderReference: jest.fn(),
    } as any;

    mockIngestionService = {
      ingest: jest.fn(),
    } as any;

    mockNormalizationService = {
      normalize: jest.fn(),
      registerProvider: jest.fn(),
      getSupportedProviders: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        {
          provide: RawEventsService,
          useValue: mockRawEventsService,
        },
        {
          provide: IngestionService,
          useValue: mockIngestionService,
        },
        {
          provide: NormalizationService,
          useValue: mockNormalizationService,
        },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
  });

  describe('getAvailableFixtures', () => {
    it('should return list of available fixture files', () => {
      const fixtures = service.getAvailableFixtures();
      expect(Array.isArray(fixtures)).toBe(true);
      expect(fixtures.length).toBeGreaterThan(0);
      // Verify we have the expected fixtures
      expect(fixtures).toContain('successful-payment');
      expect(fixtures).toContain('failed-payment');
      expect(fixtures).toContain('duplicate-payment');
      expect(fixtures).toContain('reversed-payment');
      expect(fixtures).toContain('delayed-payment');
      expect(fixtures).toContain('partial-settlement');
    });
  });

  describe('simulateFixture', () => {
    it('should successfully simulate a fixture through the pipeline', async () => {
      // Setup mocks
      mockRawEventsService.storeEvent.mockResolvedValueOnce({
        id: 'raw-event-123',
        provider: 'mtn',
        eventType: 'payment.completed',
        providerReference: 'MTN-2026-06-01-SUCCESS-001',
        headersJson: {},
        payloadJson: {},
        receivedAt: new Date(),
        verificationStatus: 'verified',
        createdAt: new Date(),
      } as any);

      mockIngestionService.ingest.mockReturnValueOnce({
        candidate: {
          id: 'mtn:MTN-2026-06-01-SUCCESS-001',
          provider: 'mtn',
          providerReference: 'MTN-2026-06-01-SUCCESS-001',
          amount: 1000.5,
          currency: 'USD',
          transactionDate: new Date(),
          description: 'Payment for services rendered',
          status: 'candidate',
          metadata: {},
          ingestedAt: new Date(),
        },
        rawEventId: 'raw-event-123',
        extractedFields: ['amount', 'currency', 'transactionDate'],
      });

      mockNormalizationService.normalize.mockReturnValueOnce({
        provider: 'mtn',
        providerReference: 'MTN-2026-06-01-SUCCESS-001',
        amount: 1000.5,
        currency: 'USD',
        payerReference: 'PAYER-123456',
        status: 'completed',
        eventTime: new Date(),
      });

      // Execute
      const result = await service.simulateFixture('successful-payment');

      // Verify
      expect(result.fixtureId).toBe('successful-payment');
      expect(result.provider).toBe('mtn');
      expect(result.status).toBe('success');
      expect(result.rawEventId).toBe('raw-event-123');
      expect(result.ingestedCandidate).toBeDefined();
      expect(result.normalizedTransaction).toBeDefined();
      expect(result.errors).toHaveLength(0);

      // Verify services were called
      expect(mockRawEventsService.storeEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'mtn',
          verificationStatus: 'verified',
        }),
      );
      expect(mockIngestionService.ingest).toHaveBeenCalled();
      expect(mockNormalizationService.normalize).toHaveBeenCalledWith('mtn', expect.any(Object));
    });

    it('should handle fixture not found error', async () => {
      // Execute
      const result = await service.simulateFixture('non-existent-fixture');

      // Verify
      expect(result.fixtureId).toBe('non-existent-fixture');
      expect(result.status).toBe('failure');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to load fixture');
    });

    it('should handle ingestion service errors', async () => {
      // Setup mocks
      mockRawEventsService.storeEvent.mockResolvedValueOnce({
        id: 'raw-event-123',
        provider: 'mtn',
        eventType: 'payment.completed',
        providerReference: 'MTN-2026-06-01-SUCCESS-001',
        headersJson: {},
        payloadJson: {},
        receivedAt: new Date(),
        verificationStatus: 'verified',
        createdAt: new Date(),
      } as any);

      mockIngestionService.ingest.mockImplementationOnce(() => {
        throw new Error('Ingestion failed: missing required field');
      });

      // Execute
      const result = await service.simulateFixture('successful-payment');

      // Verify
      expect(result.status).toBe('failure');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Ingestion failed');
    });

    it('should collect all timestamps in result', async () => {
      // Setup mocks with complete flow
      mockRawEventsService.storeEvent.mockResolvedValueOnce({
        id: 'raw-event-456',
        provider: 'mtn',
        eventType: 'payment.failed',
        providerReference: 'MTN-2026-06-01-FAILED-001',
        headersJson: {},
        payloadJson: {},
        receivedAt: new Date(),
        verificationStatus: 'verified',
        createdAt: new Date(),
      } as any);

      mockIngestionService.ingest.mockReturnValueOnce({
        candidate: {
          id: 'mtn:MTN-2026-06-01-FAILED-001',
          provider: 'mtn',
          providerReference: 'MTN-2026-06-01-FAILED-001',
          amount: 2500.0,
          currency: 'USD',
          transactionDate: new Date(),
          description: 'Failed payment',
          status: 'candidate',
          metadata: {},
          ingestedAt: new Date(),
        },
        rawEventId: 'raw-event-456',
        extractedFields: ['amount', 'currency', 'transactionDate'],
      });

      mockNormalizationService.normalize.mockReturnValueOnce({
        provider: 'mtn',
        providerReference: 'MTN-2026-06-01-FAILED-001',
        amount: 2500.0,
        currency: 'USD',
        payerReference: 'PAYER-789012',
        status: 'failed',
        eventTime: new Date(),
      });

      // Execute
      const result = await service.simulateFixture('failed-payment');

      // Verify executedAt is set
      expect(result.executedAt).toBeDefined();
      expect(result.executedAt instanceof Date).toBe(true);
      expect(result.status).toBe('success');
    });
  });
});
