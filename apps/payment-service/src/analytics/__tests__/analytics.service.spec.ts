import { Test, TestingModule } from '@nestjs/testing';
import {
  AnalyticsService,
  TransactionForAnalytics,
  ReconciliationResultForAnalytics,
  FraudSignalForAnalytics,
} from '../analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateDailyMetrics', () => {
    it('should aggregate transactions by day and currency', () => {
      const startDate = new Date('2026-06-01T00:00:00Z');
      const endDate = new Date('2026-06-03T23:59:59Z');

      const transactions: TransactionForAnalytics[] = [
        {
          id: 'tx-1',
          provider: 'stripe',
          amount: 100,
          currency: 'USD',
          transactionDate: new Date('2026-06-01T10:00:00Z'),
          status: 'succeeded',
        },
        {
          id: 'tx-2',
          provider: 'stripe',
          amount: 50,
          currency: 'USD',
          transactionDate: new Date('2026-06-01T14:00:00Z'),
          status: 'succeeded',
        },
        {
          id: 'tx-3',
          provider: 'mtn',
          amount: 200,
          currency: 'GHS',
          transactionDate: new Date('2026-06-02T10:00:00Z'),
          status: 'succeeded',
        },
      ];

      const metrics = service.generateDailyMetrics(transactions, startDate, endDate);

      expect(metrics.totalTransactions).toBe(3);
      expect(metrics.totalRevenue).toBe(350);
      expect(metrics.dailyRevenue).toHaveLength(2);
      expect(metrics.dailyRevenue[0].transactionCount).toBe(2);
      expect(metrics.dailyRevenue[0].totalAmount).toBe(150);
      expect(metrics.dailyRevenue[0].averageAmount).toBe(75);
    });

    it('should track failed transactions separately', () => {
      const startDate = new Date('2026-06-01T00:00:00Z');
      const endDate = new Date('2026-06-01T23:59:59Z');

      const transactions: TransactionForAnalytics[] = [
        {
          id: 'tx-1',
          provider: 'stripe',
          amount: 100,
          currency: 'USD',
          transactionDate: new Date('2026-06-01T10:00:00Z'),
          status: 'succeeded',
        },
        {
          id: 'tx-2',
          provider: 'stripe',
          amount: 50,
          currency: 'USD',
          transactionDate: new Date('2026-06-01T11:00:00Z'),
          status: 'failed',
          failureReason: 'insufficient_funds',
        },
        {
          id: 'tx-3',
          provider: 'mtn',
          amount: 75,
          currency: 'USD',
          transactionDate: new Date('2026-06-01T12:00:00Z'),
          status: 'failed',
          failureReason: 'insufficient_funds',
        },
        {
          id: 'tx-4',
          provider: 'mtn',
          amount: 25,
          currency: 'USD',
          transactionDate: new Date('2026-06-01T13:00:00Z'),
          status: 'failed',
          failureReason: 'network_error',
        },
      ];

      const metrics = service.generateDailyMetrics(transactions, startDate, endDate);

      expect(metrics.totalTransactions).toBe(4);
      expect(metrics.totalRevenue).toBe(100); // Only succeeded
      expect(metrics.totalFailures).toBe(3);
      expect(metrics.failedTransactions).toHaveLength(2);
      
      // Verify failure dates are from the transaction period, not current date
      const insufficientFundsFailure = metrics.failedTransactions.find(
        f => f.failureReason === 'insufficient_funds'
      );
      expect(insufficientFundsFailure).toBeDefined();
      expect(insufficientFundsFailure!.count).toBe(2);
      expect(insufficientFundsFailure!.date.toISOString()).toContain('2026-06-01');
      // 2 out of 3 failures = ~66.67%
      expect(insufficientFundsFailure!.percentage).toBeCloseTo(66.67, 1);
      
      const networkErrorFailure = metrics.failedTransactions.find(
        f => f.failureReason === 'network_error'
      );
      expect(networkErrorFailure).toBeDefined();
      expect(networkErrorFailure!.count).toBe(1);
      expect(networkErrorFailure!.date.toISOString()).toContain('2026-06-01');
      // 1 out of 3 failures = ~33.33%
      expect(networkErrorFailure!.percentage).toBeCloseTo(33.33, 1);
    });

    it('should filter transactions outside date range', () => {
      const startDate = new Date('2026-06-01T00:00:00Z');
      const endDate = new Date('2026-06-01T23:59:59Z');

      const transactions: TransactionForAnalytics[] = [
        {
          id: 'tx-1',
          provider: 'stripe',
          amount: 100,
          currency: 'USD',
          transactionDate: new Date('2026-05-31T23:59:59Z'),
          status: 'succeeded',
        },
        {
          id: 'tx-2',
          provider: 'stripe',
          amount: 50,
          currency: 'USD',
          transactionDate: new Date('2026-06-01T12:00:00Z'),
          status: 'succeeded',
        },
        {
          id: 'tx-3',
          provider: 'mtn',
          amount: 200,
          currency: 'USD',
          transactionDate: new Date('2026-06-02T00:00:00Z'),
          status: 'succeeded',
        },
      ];

      const metrics = service.generateDailyMetrics(transactions, startDate, endDate);

      expect(metrics.totalTransactions).toBe(1);
      expect(metrics.totalRevenue).toBe(50);
    });

    it('should handle empty transaction array', () => {
      const startDate = new Date('2026-06-01T00:00:00Z');
      const endDate = new Date('2026-06-01T23:59:59Z');

      const metrics = service.generateDailyMetrics([], startDate, endDate);

      expect(metrics.totalTransactions).toBe(0);
      expect(metrics.totalRevenue).toBe(0);
      expect(metrics.totalFailures).toBe(0);
      expect(metrics.dailyRevenue).toHaveLength(0);
    });
  });

  describe('generateReconciliationMetrics', () => {
    it('should calculate reconciliation rates correctly', () => {
      const startDate = new Date('2026-06-01T00:00:00Z');
      const endDate = new Date('2026-06-01T23:59:59Z');

      const results: ReconciliationResultForAnalytics[] = [
        {
          id: 'rec-1',
          transactionId: 'tx-1',
          status: 'MATCHED',
          eventTime: new Date('2026-06-01T10:00:00Z'),
        },
        {
          id: 'rec-2',
          transactionId: 'tx-2',
          status: 'MATCHED',
          eventTime: new Date('2026-06-01T11:00:00Z'),
        },
        {
          id: 'rec-3',
          transactionId: 'tx-3',
          status: 'PENDING',
          eventTime: new Date('2026-06-01T12:00:00Z'),
        },
        {
          id: 'rec-4',
          transactionId: 'tx-4',
          status: 'MISMATCHED',
          eventTime: new Date('2026-06-01T13:00:00Z'),
        },
        {
          id: 'rec-5',
          transactionId: 'tx-5',
          status: 'DUPLICATE',
          eventTime: new Date('2026-06-01T14:00:00Z'),
        },
      ];

      const metrics = service.generateReconciliationMetrics(
        results,
        startDate,
        endDate,
      );

      expect(metrics.totalReconciliationRecords).toBe(5);
      expect(metrics.overallMatchRate).toBeCloseTo(40);
      expect(metrics.overallPendingRate).toBeCloseTo(20);
      expect(metrics.overallMismatchRate).toBeCloseTo(20);
      expect(metrics.overallDuplicateRate).toBeCloseTo(20);
    });

    it('should aggregate metrics by day', () => {
      const startDate = new Date('2026-06-01T00:00:00Z');
      const endDate = new Date('2026-06-02T23:59:59Z');

      const results: ReconciliationResultForAnalytics[] = [
        {
          id: 'rec-1',
          transactionId: 'tx-1',
          status: 'MATCHED',
          eventTime: new Date('2026-06-01T10:00:00Z'),
        },
        {
          id: 'rec-2',
          transactionId: 'tx-2',
          status: 'PENDING',
          eventTime: new Date('2026-06-01T11:00:00Z'),
        },
        {
          id: 'rec-3',
          transactionId: 'tx-3',
          status: 'MATCHED',
          eventTime: new Date('2026-06-02T10:00:00Z'),
        },
      ];

      const metrics = service.generateReconciliationMetrics(
        results,
        startDate,
        endDate,
      );

      expect(metrics.reconciliationRate).toHaveLength(2);
      expect(metrics.reconciliationRate[0].totalCount).toBe(2);
      expect(metrics.reconciliationRate[0].matchRate).toBeCloseTo(50);
      expect(metrics.reconciliationRate[1].totalCount).toBe(1);
      expect(metrics.reconciliationRate[1].matchRate).toBe(100);
    });

    it('should handle empty results array', () => {
      const startDate = new Date('2026-06-01T00:00:00Z');
      const endDate = new Date('2026-06-01T23:59:59Z');

      const metrics = service.generateReconciliationMetrics([], startDate, endDate);

      expect(metrics.totalReconciliationRecords).toBe(0);
      expect(metrics.overallMatchRate).toBe(0);
      expect(metrics.reconciliationRate).toHaveLength(0);
    });
  });

  describe('generateFraudSignalMetrics', () => {
    it('should count fraud signals by type and severity', () => {
      const startDate = new Date('2026-06-01T00:00:00Z');
      const endDate = new Date('2026-06-01T23:59:59Z');

      const signals: FraudSignalForAnalytics[] = [
        {
          id: 'signal-1',
          transactionId: 'tx-1',
          signalType: 'DUPLICATE_TRANSACTION',
          severity: 'high',
          detectedAt: new Date('2026-06-01T10:00:00Z'),
        },
        {
          id: 'signal-2',
          transactionId: 'tx-2',
          signalType: 'UNUSUAL_AMOUNT',
          severity: 'medium',
          detectedAt: new Date('2026-06-01T11:00:00Z'),
        },
        {
          id: 'signal-3',
          transactionId: 'tx-3',
          signalType: 'DUPLICATE_TRANSACTION',
          severity: 'high',
          detectedAt: new Date('2026-06-01T12:00:00Z'),
        },
        {
          id: 'signal-4',
          transactionId: 'tx-4',
          signalType: 'UNUSUAL_AMOUNT',
          severity: 'low',
          detectedAt: new Date('2026-06-01T13:00:00Z'),
        },
      ];

      const metrics = service.generateFraudSignalMetrics(signals, startDate, endDate);

      expect(metrics).toHaveLength(3); // 2 DUPLICATE_TRANSACTION high grouped, 1 UNUSUAL_AMOUNT medium, 1 UNUSUAL_AMOUNT low
      const duplicateHighMetric = metrics.find(
        (m) => m.signalType === 'DUPLICATE_TRANSACTION' && m.severity === 'high',
      );
      expect(duplicateHighMetric?.count).toBe(2);
      expect(duplicateHighMetric?.averageSeverityScore).toBe(3);
    });

    it('should filter signals outside date range', () => {
      const startDate = new Date('2026-06-01T00:00:00Z');
      const endDate = new Date('2026-06-01T23:59:59Z');

      const signals: FraudSignalForAnalytics[] = [
        {
          id: 'signal-1',
          transactionId: 'tx-1',
          signalType: 'DUPLICATE_TRANSACTION',
          severity: 'high',
          detectedAt: new Date('2026-05-31T23:59:59Z'),
        },
        {
          id: 'signal-2',
          transactionId: 'tx-2',
          signalType: 'UNUSUAL_AMOUNT',
          severity: 'medium',
          detectedAt: new Date('2026-06-01T12:00:00Z'),
        },
        {
          id: 'signal-3',
          transactionId: 'tx-3',
          signalType: 'UNKNOWN_REFERENCE',
          severity: 'high',
          detectedAt: new Date('2026-06-02T00:00:00Z'),
        },
      ];

      const metrics = service.generateFraudSignalMetrics(signals, startDate, endDate);

      expect(metrics).toHaveLength(1);
      expect(metrics[0].signalType).toBe('UNUSUAL_AMOUNT');
    });

    it('should handle empty signals array', () => {
      const startDate = new Date('2026-06-01T00:00:00Z');
      const endDate = new Date('2026-06-01T23:59:59Z');

      const metrics = service.generateFraudSignalMetrics([], startDate, endDate);

      expect(metrics).toHaveLength(0);
    });

    it('should calculate average severity scores correctly', () => {
      const startDate = new Date('2026-06-01T00:00:00Z');
      const endDate = new Date('2026-06-01T23:59:59Z');

      const signals: FraudSignalForAnalytics[] = [
        {
          id: 'signal-1',
          transactionId: 'tx-1',
          signalType: 'UNUSUAL_AMOUNT',
          severity: 'low', // score = 1
          detectedAt: new Date('2026-06-01T10:00:00Z'),
        },
        {
          id: 'signal-2',
          transactionId: 'tx-2',
          signalType: 'UNUSUAL_AMOUNT',
          severity: 'high', // score = 3
          detectedAt: new Date('2026-06-01T11:00:00Z'),
        },
      ];

      const metrics = service.generateFraudSignalMetrics(signals, startDate, endDate);

      expect(metrics).toHaveLength(2);
      const lowMetric = metrics.find((m) => m.severity === 'low');
      expect(lowMetric?.averageSeverityScore).toBe(1);
      const highMetric = metrics.find((m) => m.severity === 'high');
      expect(highMetric?.averageSeverityScore).toBe(3);
    });
  });
});
