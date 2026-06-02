import { Test, TestingModule } from '@nestjs/testing';
import { EdgeCaseScenarioRunner } from '../edge-case-scenario-runner';
import { SimulationService } from '../simulation.service';
import { RawEventsService } from '../../raw-events/raw-events.service';
import { IngestionService } from '../../ingestion/ingestion.service';
import { NormalizationService } from '../../normalization/normalization.service';

describe('EdgeCaseScenarioRunner', () => {
  let runner: EdgeCaseScenarioRunner;
  let simulationService: SimulationService;
  let mockRawEventsService: any;
  let mockIngestionService: any;
  let mockNormalizationService: any;

  beforeEach(async () => {
    // Create mock services
    mockRawEventsService = {
      storeEvent: jest.fn().mockResolvedValue({
        id: 'raw-event-mock-id',
        provider: 'mtn',
        eventType: 'payment.completed',
        verificationStatus: 'verified',
      }),
      findByProviderReference: jest.fn(),
    };

    mockIngestionService = {
      ingest: jest.fn().mockReturnValue({
        candidate: {
          id: 'candidate-mock-id',
          provider: 'mtn',
          status: 'ingested',
          amount: 1000,
        },
      }),
    };

    mockNormalizationService = {
      normalize: jest.fn().mockReturnValue({
        id: 'normalized-mock-id',
        amount: 1000,
        currency: 'USD',
        status: 'completed',
      }),
      registerProvider: jest.fn(),
      getSupportedProviders: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EdgeCaseScenarioRunner,
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

    runner = module.get<EdgeCaseScenarioRunner>(EdgeCaseScenarioRunner);
    simulationService = module.get<SimulationService>(SimulationService);
  });

  it('should be defined', () => {
    expect(runner).toBeDefined();
    expect(simulationService).toBeDefined();
  });

  describe('runAllScenarios', () => {
    it('should execute all edge-case scenarios', async () => {
      const report = await runner.runAllScenarios();

      expect(report).toBeDefined();
      expect(report.totalScenarios).toBe(8);
      expect(report.scenarios).toHaveLength(8);
      expect(report.timestamp).toBeDefined();
      expect(report.passRate).toBeGreaterThanOrEqual(0);
      expect(report.passRate).toBeLessThanOrEqual(100);
    });

    it('should include all scenario IDs in the report', async () => {
      const report = await runner.runAllScenarios();

      const expectedScenarioIds = [
        'scenario-01',
        'scenario-02',
        'scenario-03',
        'scenario-04',
        'scenario-05',
        'scenario-06',
        'scenario-07',
        'scenario-08',
      ];

      const reportScenarioIds = report.scenarios.map((s) => s.scenario.id);
      expect(reportScenarioIds).toEqual(expect.arrayContaining(expectedScenarioIds));
    });

    it('should verify each scenario has expected vs actual outcomes', async () => {
      const report = await runner.runAllScenarios();

      for (const result of report.scenarios) {
        expect(result.expectedOutcome).toBeDefined();
        expect(result.actualOutcome).toBeDefined();
        expect(result.message).toBeDefined();
        expect(result.details).toBeDefined();
        expect(result.details.executedAt).toBeDefined();
      }
    });
  });

  describe('saveReportToFile', () => {
    it('should save report to file', async () => {
      const report = await runner.runAllScenarios();
      const testFilename = `test-report-${Date.now()}.json`;

      const filePath = await runner.saveReportToFile(report, testFilename);

      expect(filePath).toBeDefined();
      expect(filePath.endsWith(testFilename)).toBe(true);

      // Clean up
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    it('should save with default filename', async () => {
      const report = await runner.runAllScenarios();

      const filePath = await runner.saveReportToFile(report);

      expect(filePath).toBeDefined();
      expect(filePath.endsWith('scenario-results.json')).toBe(true);

      // Clean up
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });
});
