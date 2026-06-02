import { Test, TestingModule } from '@nestjs/testing';
import { LoadValidationService } from '../load-validation.service';
import { SimulationRunnerService } from '../simulation-runner.service';
import { SimulationMetricsService } from '../simulation-metrics.service';
import { TransactionGeneratorService } from '../generators/transaction-generator.service';
import { SimulationModule } from '../simulation.module';

describe('LoadValidationService', () => {
  let service: LoadValidationService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [SimulationModule],
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
    });
  });

  describe('runLoadValidation', () => {
    it('should run load validation and return report', async () => {
      const report = await service.runLoadValidation();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.overallStatus).toMatch(/GO|NO-GO/);
      expect(report.gateCriteria).toBeDefined();
      expect(report.gateCriteria.length).toBeGreaterThan(0);
      expect(report.loadTestMetrics).toBeDefined();
      expect(report.summary).toBeDefined();
    });

    it('should collect metrics for 1000-event test', async () => {
      const report = await service.runLoadValidation();
      const metrics = report.loadTestMetrics.test1000;

      expect(metrics.eventCount).toBe(1000);
      expect(metrics.successCount).toBeGreaterThanOrEqual(0);
      expect(metrics.failedCount).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.reconciliationAccuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });

    it('should collect metrics for 5000-event test', async () => {
      const report = await service.runLoadValidation();
      const metrics = report.loadTestMetrics.test5000;

      expect(metrics.eventCount).toBe(5000);
      expect(metrics.successCount).toBeGreaterThanOrEqual(0);
      expect(metrics.fraudDetections).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsed).toBeGreaterThanOrEqual(0);
    });

    it('should collect metrics for 10000-event test', async () => {
      const report = await service.runLoadValidation();
      const metrics = report.loadTestMetrics.test10000;

      expect(metrics.eventCount).toBe(10000);
      expect(metrics.successCount).toBeGreaterThanOrEqual(0);
      expect(metrics.duplicateDetections).toBeGreaterThanOrEqual(0);
    });

    it('should validate gate criteria', async () => {
      const report = await service.runLoadValidation();

      expect(report.gateCriteria.length).toBe(8);

      const criteria = report.gateCriteria.map(c => c.criterion);
      expect(criteria).toContain('Build Pass');
      expect(criteria).toContain('Tests Pass');
      expect(criteria).toContain('1000 Event Simulation');
      expect(criteria).toContain('Edge Cases Pass');
      expect(criteria).toContain('Fraud Detection Pass');
      expect(criteria).toContain('Reconciliation Accuracy ≥ 99%');
      expect(criteria).toContain('No Data Corruption');
      expect(criteria).toContain('No Duplicate Creation');
    });

    it('should validate gate criteria status', async () => {
      const report = await service.runLoadValidation();

      for (const criterion of report.gateCriteria) {
        expect(['PASS', 'FAIL', 'WARN']).toContain(criterion.status);
      }
    });

    it('should calculate summary statistics', async () => {
      const report = await service.runLoadValidation();
      const summary = report.summary;

      expect(summary.totalEventsProcessed).toBe(1000 + 5000 + 10000);
      expect(summary.totalSuccessful).toBeGreaterThanOrEqual(0);
      expect(summary.totalFailed).toBeGreaterThanOrEqual(0);
      expect(summary.averageReconciliationAccuracy).toBeGreaterThanOrEqual(0);
      expect(summary.averageErrorRate).toBeGreaterThanOrEqual(0);
      expect(summary.averageProcessingTimePerEvent).toBeGreaterThanOrEqual(0);
      expect(summary.throughputEventsPerSecond).toBeGreaterThan(0);
    });

    it('should have overall status based on criteria', async () => {
      const report = await service.runLoadValidation();

      const hasFailures = report.gateCriteria.some(c => c.status === 'FAIL');
      if (hasFailures) {
        expect(report.overallStatus).toBe('NO-GO');
      } else {
        expect(report.overallStatus).toBe('GO');
      }
    });
  });
});
