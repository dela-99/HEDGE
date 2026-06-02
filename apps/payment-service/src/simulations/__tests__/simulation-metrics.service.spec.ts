import { Test, TestingModule } from '@nestjs/testing';
import { SimulationMetricsService, SimulationReport } from '../simulation-metrics.service';
import { SimulationSummary, PipelineEventResult } from '../simulation-runner.service';

describe('SimulationMetricsService', () => {
  let service: SimulationMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SimulationMetricsService],
    }).compile();

    service = module.get<SimulationMetricsService>(SimulationMetricsService);
  });

  describe('collectMetrics', () => {
    it('should collect metrics from simulation summary', () => {
      // Create mock pipeline results
      const pipelineResults: PipelineEventResult[] = [
        {
          transactionId: 'txn-1',
          provider: 'mtn',
          status: 'success',
          originalStatus: 'SUCCESSFUL',
          amount: 1000,
          currency: 'USD',
          rawEventId: 'raw-1',
          fraudSignals: [],
          errors: [],
          executedAt: new Date(),
        },
        {
          transactionId: 'txn-2',
          provider: 'mtn',
          status: 'success',
          originalStatus: 'SUCCESSFUL',
          amount: 500,
          currency: 'USD',
          rawEventId: 'raw-2',
          fraudSignals: [{ type: 'DUPLICATE_TRANSACTION', severity: 'high' }],
          reconciliationStatus: 'MATCHED',
          errors: [],
          executedAt: new Date(),
        },
        {
          transactionId: 'txn-3',
          provider: 'mtn',
          status: 'failure',
          originalStatus: 'FAILED',
          amount: 200,
          currency: 'USD',
          fraudSignals: [],
          errors: ['Payment failed'],
          executedAt: new Date(),
        },
        {
          transactionId: 'txn-4',
          provider: 'mtn',
          status: 'success',
          originalStatus: 'DUPLICATE',
          amount: 300,
          currency: 'USD',
          rawEventId: 'raw-4',
          fraudSignals: [],
          reconciliationStatus: 'MISMATCHED',
          errors: [],
          executedAt: new Date(),
        },
      ];

      const summary: SimulationSummary = {
        processed: 3,
        failed: 1,
        duplicates: 1,
        reversed: 0,
        reconciled: 1,
        fraudFlags: 1,
        successCount: 3,
        failedCount: 1,
        duplicateCount: 1,
        reversalCount: 0,
        matchedCount: 1,
        pendingCount: 0,
        mismatchedCount: 1,
        fraudSignalCount: 1,
        pipelineResults,
        executedAt: new Date(),
        duration: 1000,
      };

      // Execute
      const report = service.collectMetrics(summary);

      // Verify
      expect(report).toBeDefined();
      expect(report.totalEvents).toBe(4);
      expect(report.successfulEvents).toBe(3);
      expect(report.failedEvents).toBe(1);
      expect(report.duplicateDetections).toBe(1);
      expect(report.fraudDetections).toBe(1);
      expect(report.fraudSignalCount).toBe(1);
      expect(report.reconciliationMatches).toBe(1);
      expect(report.reconciliationMismatches).toBe(1);
      expect(report.errorCount).toBe(1);
      expect(report.totalProcessingTime).toBe(1000);
      expect(report.averageProcessingTime).toBe(250); // 1000 / 4
      expect(report.successRate).toBeCloseTo(75, 1); // 3/4 * 100
      expect(report.fraudRate).toBeCloseTo(25, 1); // 1/4 * 100
      expect(report.matchRate).toBeCloseTo(50, 1); // 1/2 * 100
    });

    it('should handle empty pipeline results', () => {
      const summary: SimulationSummary = {
        processed: 0,
        failed: 0,
        duplicates: 0,
        reversed: 0,
        reconciled: 0,
        fraudFlags: 0,
        successCount: 0,
        failedCount: 0,
        duplicateCount: 0,
        reversalCount: 0,
        matchedCount: 0,
        pendingCount: 0,
        mismatchedCount: 0,
        fraudSignalCount: 0,
        pipelineResults: [],
        executedAt: new Date(),
        duration: 0,
      };

      // Execute
      const report = service.collectMetrics(summary);

      // Verify
      expect(report.totalEvents).toBe(0);
      expect(report.successfulEvents).toBe(0);
      expect(report.averageProcessingTime).toBe(0);
      expect(report.successRate).toBe(0);
    });

    it('should count multiple fraud signals correctly', () => {
      const pipelineResults: PipelineEventResult[] = [
        {
          transactionId: 'txn-1',
          provider: 'mtn',
          status: 'success',
          originalStatus: 'SUCCESSFUL',
          amount: 1000,
          currency: 'USD',
          fraudSignals: [
            { type: 'DUPLICATE_TRANSACTION', severity: 'high' },
            { type: 'UNUSUAL_AMOUNT', severity: 'medium' },
          ],
          errors: [],
          executedAt: new Date(),
        },
      ];

      const summary: SimulationSummary = {
        processed: 1,
        failed: 0,
        duplicates: 0,
        reversed: 0,
        reconciled: 0,
        fraudFlags: 1,
        successCount: 1,
        failedCount: 0,
        duplicateCount: 0,
        reversalCount: 0,
        matchedCount: 0,
        pendingCount: 0,
        mismatchedCount: 0,
        fraudSignalCount: 2,
        pipelineResults,
        executedAt: new Date(),
        duration: 100,
      };

      // Execute
      const report = service.collectMetrics(summary);

      // Verify
      expect(report.fraudDetections).toBe(1); // 1 transaction with fraud signals
      expect(report.fraudSignalCount).toBe(2); // 2 individual signals
    });

    it('should count reconciliation pending status', () => {
      const pipelineResults: PipelineEventResult[] = [
        {
          transactionId: 'txn-1',
          provider: 'mtn',
          status: 'success',
          originalStatus: 'SUCCESSFUL',
          amount: 1000,
          currency: 'USD',
          reconciliationStatus: 'PENDING',
          fraudSignals: [],
          errors: [],
          executedAt: new Date(),
        },
      ];

      const summary: SimulationSummary = {
        processed: 1,
        failed: 0,
        duplicates: 0,
        reversed: 0,
        reconciled: 0,
        fraudFlags: 0,
        successCount: 1,
        failedCount: 0,
        duplicateCount: 0,
        reversalCount: 0,
        matchedCount: 0,
        pendingCount: 1,
        mismatchedCount: 0,
        fraudSignalCount: 0,
        pipelineResults,
        executedAt: new Date(),
        duration: 100,
      };

      // Execute
      const report = service.collectMetrics(summary);

      // Verify
      expect(report.reconciliationPending).toBe(1);
      expect(report.reconciliationMatches).toBe(0);
      expect(report.reconciliationMismatches).toBe(0);
    });
  });

  describe('exportToJSON', () => {
    it('should export report as JSON string', () => {
      const report: SimulationReport = {
        totalEvents: 10,
        successfulEvents: 8,
        failedEvents: 2,
        duplicateDetections: 1,
        fraudDetections: 2,
        reconciliationMatches: 6,
        reconciliationMismatches: 1,
        averageProcessingTime: 100,
        errorCount: 2,
        totalProcessingTime: 1000,
        fraudSignalCount: 2,
        reconciliationPending: 1,
        successRate: 80,
        fraudRate: 20,
        matchRate: 85.7,
        executedAt: new Date('2026-06-01T00:00:00Z'),
      };

      // Execute
      const json = service.exportToJSON(report);

      // Verify
      expect(typeof json).toBe('string');
      expect(json).toContain('"totalEvents": 10');
      expect(json).toContain('"successfulEvents": 8');
      expect(json).toContain('"failedEvents": 2');
      const parsed = JSON.parse(json);
      expect(parsed.totalEvents).toBe(10);
    });

    it('should produce valid JSON', () => {
      const report: SimulationReport = {
        totalEvents: 5,
        successfulEvents: 4,
        failedEvents: 1,
        duplicateDetections: 0,
        fraudDetections: 0,
        reconciliationMatches: 3,
        reconciliationMismatches: 0,
        averageProcessingTime: 50,
        errorCount: 0,
        totalProcessingTime: 250,
        fraudSignalCount: 0,
        reconciliationPending: 1,
        successRate: 80,
        fraudRate: 0,
        matchRate: 100,
        executedAt: new Date(),
      };

      // Execute
      const json = service.exportToJSON(report);

      // Verify - should not throw
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('exportToObject', () => {
    it('should export report as plain object', () => {
      const now = new Date('2026-06-01T00:00:00Z');
      const report: SimulationReport = {
        totalEvents: 10,
        successfulEvents: 8,
        failedEvents: 2,
        duplicateDetections: 1,
        fraudDetections: 2,
        reconciliationMatches: 6,
        reconciliationMismatches: 1,
        averageProcessingTime: 100,
        errorCount: 2,
        totalProcessingTime: 1000,
        fraudSignalCount: 2,
        reconciliationPending: 1,
        successRate: 80,
        fraudRate: 20,
        matchRate: 85.7,
        executedAt: now,
      };

      // Execute
      const obj = service.exportToObject(report);

      // Verify
      expect(obj).toBeDefined();
      expect(obj.totalEvents).toBe(10);
      expect(obj.successfulEvents).toBe(8);
      expect(obj.failedEvents).toBe(2);
      expect(obj.executedAt).toBe(now.toISOString());
    });

    it('should not include complex properties in exported object', () => {
      const report: SimulationReport = {
        totalEvents: 5,
        successfulEvents: 4,
        failedEvents: 1,
        duplicateDetections: 0,
        fraudDetections: 0,
        reconciliationMatches: 3,
        reconciliationMismatches: 0,
        averageProcessingTime: 50,
        errorCount: 0,
        totalProcessingTime: 250,
        fraudSignalCount: 0,
        reconciliationPending: 1,
        successRate: 80,
        fraudRate: 0,
        matchRate: 100,
        executedAt: new Date(),
      };

      // Execute
      const obj = service.exportToObject(report);

      // Verify - only expected fields are present
      expect(Object.keys(obj)).toEqual([
        'totalEvents',
        'successfulEvents',
        'failedEvents',
        'duplicateDetections',
        'fraudDetections',
        'reconciliationMatches',
        'reconciliationMismatches',
        'averageProcessingTime',
        'errorCount',
        'totalProcessingTime',
        'fraudSignalCount',
        'reconciliationPending',
        'successRate',
        'fraudRate',
        'matchRate',
        'executedAt',
      ]);
    });
  });

  describe('generateSummary', () => {
    it('should generate human-readable summary', () => {
      const report: SimulationReport = {
        totalEvents: 10,
        successfulEvents: 8,
        failedEvents: 2,
        duplicateDetections: 1,
        fraudDetections: 2,
        reconciliationMatches: 6,
        reconciliationMismatches: 1,
        averageProcessingTime: 100,
        errorCount: 2,
        totalProcessingTime: 1000,
        fraudSignalCount: 2,
        reconciliationPending: 1,
        successRate: 80,
        fraudRate: 20,
        matchRate: 85.7,
        executedAt: new Date('2026-06-01T00:00:00Z'),
      };

      // Execute
      const summary = service.generateSummary(report);

      // Verify
      expect(summary).toContain('Simulation Metrics Report');
      expect(summary).toContain('Total Events: 10');
      expect(summary).toContain('Successful Events: 8');
      expect(summary).toContain('Failed Events: 2');
      expect(summary).toContain('Success Rate: 80.00%');
      expect(summary).toContain('Duplicate Detections: 1');
      expect(summary).toContain('Fraud Detections: 2');
      expect(summary).toContain('Reconciliation Matches: 6');
      expect(summary).toContain('Reconciliation Mismatches: 1');
      expect(summary).toContain('Average Processing Time: 100.00ms');
      expect(summary).toContain('Total Errors: 2');
    });

    it('should format percentages correctly', () => {
      const report: SimulationReport = {
        totalEvents: 3,
        successfulEvents: 2,
        failedEvents: 1,
        duplicateDetections: 0,
        fraudDetections: 1,
        reconciliationMatches: 1,
        reconciliationMismatches: 0,
        averageProcessingTime: 33.33,
        errorCount: 0,
        totalProcessingTime: 100,
        fraudSignalCount: 1,
        reconciliationPending: 0,
        successRate: 66.66666666,
        fraudRate: 33.33333333,
        matchRate: 100,
        executedAt: new Date(),
      };

      // Execute
      const summary = service.generateSummary(report);

      // Verify - percentages should be formatted to 2 decimal places
      expect(summary).toContain('Success Rate: 66.67%');
      expect(summary).toContain('(33.33%)');
      expect(summary).toContain('Match Rate: 100.00%');
    });
  });
});
