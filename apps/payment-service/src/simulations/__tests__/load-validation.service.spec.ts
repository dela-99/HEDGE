import { Test, TestingModule } from '@nestjs/testing';
import { LoadValidationService } from '../load-validation.service';
import { SimulationRunnerService } from '../simulation-runner.service';
import { SimulationMetricsService } from '../simulation-metrics.service';
import { TransactionGeneratorService } from '../generators/transaction-generator.service';
import { RawEventsModule } from '../../raw-events/raw-events.module';
import { IngestionModule } from '../../ingestion/ingestion.module';
import { NormalizationModule } from '../../normalization/normalization.module';
import { FraudModule } from '../../fraud/fraud.module';
import { ReconciliationModule } from '../../reconciliation/reconciliation.module';
import { AnalyticsModule } from '../../analytics/analytics.module';

describe('LoadValidationService', () => {
  let service: LoadValidationService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        RawEventsModule,
        IngestionModule,
        NormalizationModule,
        FraudModule,
        ReconciliationModule,
        AnalyticsModule,
      ],
      providers: [
        LoadValidationService,
        SimulationRunnerService,
        SimulationMetricsService,
        TransactionGeneratorService,
      ],
    }).compile();

    service = module.get<LoadValidationService>(LoadValidationService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have required dependencies', () => {
      expect(module.get(TransactionGeneratorService)).toBeDefined();
      expect(module.get(SimulationRunnerService)).toBeDefined();
      expect(module.get(SimulationMetricsService)).toBeDefined();
      expect(module.get(LoadValidationService)).toBeDefined();
    });

    it('should export LoadValidationService correctly', () => {
      expect(service).toBeInstanceOf(LoadValidationService);
    });
  });

  describe('runLoadValidation', () => {
    it('should be a callable method', () => {
      expect(service.runLoadValidation).toBeDefined();
      expect(typeof service.runLoadValidation).toBe('function');
    });
  });
});


