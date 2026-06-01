import { Injectable } from '@nestjs/common';

/**
 * Represents a daily revenue metric entry.
 */
export interface DailyRevenueMetric {
  date: Date;
  currency: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
}

/**
 * Represents failed transaction metrics.
 */
export interface FailedTransactionMetric {
  date: Date;
  failureReason: string;
  count: number;
  percentage: number;
}

/**
 * Represents reconciliation rate metric.
 */
export interface ReconciliationRateMetric {
  date: Date;
  matchedCount: number;
  pendingCount: number;
  mismatchedCount: number;
  duplicateCount: number;
  totalCount: number;
  matchRate: number;
  pendingRate: number;
  mismatchRate: number;
  duplicateRate: number;
}

/**
 * Represents fraud signal count metric.
 */
export interface FraudSignalCountMetric {
  date: Date;
  signalType: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  averageSeverityScore: number;
}

/**
 * Daily metrics aggregation result.
 */
export interface DailyMetrics {
  generatedAt: Date;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  dailyRevenue: DailyRevenueMetric[];
  failedTransactions: FailedTransactionMetric[];
  totalRevenue: number;
  totalTransactions: number;
  totalFailures: number;
}

/**
 * Reconciliation metrics aggregation result.
 */
export interface ReconciliationMetrics {
  generatedAt: Date;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  reconciliationRate: ReconciliationRateMetric[];
  overallMatchRate: number;
  overallPendingRate: number;
  overallMismatchRate: number;
  overallDuplicateRate: number;
  totalReconciliationRecords: number;
}

/**
 * Transaction data for analytics aggregation.
 */
export interface TransactionForAnalytics {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  transactionDate: Date;
  status: string; // 'succeeded', 'failed', 'pending'
  failureReason?: string;
}

/**
 * Reconciliation result data for analytics.
 */
export interface ReconciliationResultForAnalytics {
  id: string;
  transactionId: string;
  status: 'MATCHED' | 'PENDING' | 'MISMATCHED' | 'DUPLICATE';
  eventTime: Date;
  matchScore?: number;
}

/**
 * Fraud signal data for analytics.
 */
export interface FraudSignalForAnalytics {
  id: string;
  transactionId: string;
  signalType: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: Date;
}

/**
 * AnalyticsService provides backend aggregation of financial metrics.
 *
 * Responsibilities:
 * - Aggregate daily revenue metrics
 * - Calculate failed transaction statistics
 * - Compute reconciliation rates
 * - Count fraud signals by type and severity
 * - Provide aggregated metrics without UI/charts
 *
 * Does NOT:
 * - Persist metrics
 * - Block transactions
 * - Make business decisions
 * - Generate visualizations
 *
 * This is a stateless, aggregation-only service.
 */
@Injectable()
export class AnalyticsService {
  /**
   * Generate daily metrics from transaction data.
   * Aggregates revenue, transaction counts, and failures by day and currency.
   *
   * @param transactions - Array of transactions to analyze
   * @param startDate - Start of analysis period
   * @param endDate - End of analysis period
   * @returns DailyMetrics with aggregated daily data
   */
  generateDailyMetrics(
    transactions: TransactionForAnalytics[],
    startDate: Date,
    endDate: Date,
  ): DailyMetrics {
    // Filter transactions within date range
    const filteredTransactions = transactions.filter((tx) => {
      const txDate = new Date(tx.transactionDate);
      return txDate >= startDate && txDate <= endDate;
    });

    // Group transactions by date and currency
    const dailyByDateCurrency = new Map<
      string,
      {
        total: number;
        count: number;
        currency: string;
        date: Date;
      }
    >();

    // Group failed transactions by date and reason
    const failuresByDateReason = new Map<
      string,
      {
        count: number;
        date: Date;
        reason: string;
      }
    >();

    let totalRevenue = 0;
    let totalFailures = 0;
    let totalTransactionsProcessed = 0;

    for (const tx of filteredTransactions) {
      const dateKey = this.getDateKey(tx.transactionDate);
      const currencyDateKey = `${dateKey}:${tx.currency}`;

      // Track revenue for successful/pending transactions
      if (tx.status === 'succeeded' || tx.status === 'pending') {
        totalRevenue += tx.amount;

        if (!dailyByDateCurrency.has(currencyDateKey)) {
          dailyByDateCurrency.set(currencyDateKey, {
            total: 0,
            count: 0,
            currency: tx.currency,
            date: this.getDateFromKey(dateKey),
          });
        }

        const dayData = dailyByDateCurrency.get(currencyDateKey)!;
        dayData.total += tx.amount;
        dayData.count += 1;
      }

      // Track failures with date accuracy
      if (tx.status === 'failed') {
        totalFailures += 1;
        const reason = tx.failureReason || 'unknown';
        const failureKey = `${dateKey}:${reason}`;

        if (!failuresByDateReason.has(failureKey)) {
          failuresByDateReason.set(failureKey, {
            count: 0,
            date: this.getDateFromKey(dateKey),
            reason,
          });
        }

        const failureData = failuresByDateReason.get(failureKey)!;
        failureData.count += 1;
      }

      totalTransactionsProcessed += 1;
    }

    // Convert daily data to sorted array
    const dailyRevenue = Array.from(dailyByDateCurrency.values())
      .map((d) => ({
        date: d.date,
        currency: d.currency,
        totalAmount: d.total,
        transactionCount: d.count,
        averageAmount: d.count > 0 ? d.total / d.count : 0,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate failure metrics with accurate dates
    const failedTransactions = Array.from(failuresByDateReason.values())
      .map((f) => ({
        date: f.date,
        failureReason: f.reason,
        count: f.count,
        percentage: totalTransactionsProcessed > 0
          ? (f.count / totalTransactionsProcessed) * 100
          : 0,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime() || b.count - a.count);

    return {
      generatedAt: new Date(),
      dateRange: {
        startDate,
        endDate,
      },
      dailyRevenue,
      failedTransactions,
      totalRevenue,
      totalTransactions: filteredTransactions.length,
      totalFailures,
    };
  }

  /**
   * Generate reconciliation metrics from reconciliation results.
   * Calculates match rates, pending rates, and other reconciliation KPIs.
   *
   * @param reconciliationResults - Array of reconciliation results
   * @param startDate - Start of analysis period
   * @param endDate - End of analysis period
   * @returns ReconciliationMetrics with aggregated reconciliation data
   */
  generateReconciliationMetrics(
    reconciliationResults: ReconciliationResultForAnalytics[],
    startDate: Date,
    endDate: Date,
  ): ReconciliationMetrics {
    // Filter results within date range
    const filteredResults = reconciliationResults.filter((result) => {
      const resultDate = new Date(result.eventTime);
      return resultDate >= startDate && resultDate <= endDate;
    });

    // Group by date and count statuses
    const dailyStatuses = new Map<
      string,
      {
        matched: number;
        pending: number;
        mismatched: number;
        duplicate: number;
        total: number;
        date: Date;
      }
    >();

    let totalMatched = 0;
    let totalPending = 0;
    let totalMismatched = 0;
    let totalDuplicate = 0;

    for (const result of filteredResults) {
      const dateKey = this.getDateKey(result.eventTime);

      if (!dailyStatuses.has(dateKey)) {
        dailyStatuses.set(dateKey, {
          matched: 0,
          pending: 0,
          mismatched: 0,
          duplicate: 0,
          total: 0,
          date: this.getDateFromKey(dateKey),
        });
      }

      const dayData = dailyStatuses.get(dateKey)!;
      dayData.total += 1;

      switch (result.status) {
        case 'MATCHED':
          dayData.matched += 1;
          totalMatched += 1;
          break;
        case 'PENDING':
          dayData.pending += 1;
          totalPending += 1;
          break;
        case 'MISMATCHED':
          dayData.mismatched += 1;
          totalMismatched += 1;
          break;
        case 'DUPLICATE':
          dayData.duplicate += 1;
          totalDuplicate += 1;
          break;
      }
    }

    // Calculate rates for each day
    const reconciliationRate = Array.from(dailyStatuses.values())
      .map((d) => ({
        date: d.date,
        matchedCount: d.matched,
        pendingCount: d.pending,
        mismatchedCount: d.mismatched,
        duplicateCount: d.duplicate,
        totalCount: d.total,
        matchRate: d.total > 0 ? (d.matched / d.total) * 100 : 0,
        pendingRate: d.total > 0 ? (d.pending / d.total) * 100 : 0,
        mismatchRate: d.total > 0 ? (d.mismatched / d.total) * 100 : 0,
        duplicateRate: d.total > 0 ? (d.duplicate / d.total) * 100 : 0,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate overall rates
    const totalCount = filteredResults.length;
    const overallMatchRate = totalCount > 0 ? (totalMatched / totalCount) * 100 : 0;
    const overallPendingRate = totalCount > 0 ? (totalPending / totalCount) * 100 : 0;
    const overallMismatchRate = totalCount > 0 ? (totalMismatched / totalCount) * 100 : 0;
    const overallDuplicateRate = totalCount > 0 ? (totalDuplicate / totalCount) * 100 : 0;

    return {
      generatedAt: new Date(),
      dateRange: {
        startDate,
        endDate,
      },
      reconciliationRate,
      overallMatchRate,
      overallPendingRate,
      overallMismatchRate,
      overallDuplicateRate,
      totalReconciliationRecords: totalCount,
    };
  }

  /**
   * Generate fraud signal count metrics.
   * Aggregates fraud signals by type, severity, and time.
   *
   * @param fraudSignals - Array of fraud signals
   * @param startDate - Start of analysis period
   * @param endDate - End of analysis period
   * @returns Array of fraud signal count metrics
   */
  generateFraudSignalMetrics(
    fraudSignals: FraudSignalForAnalytics[],
    startDate: Date,
    endDate: Date,
  ): FraudSignalCountMetric[] {
    // Filter signals within date range
    const filteredSignals = fraudSignals.filter((signal) => {
      const signalDate = new Date(signal.detectedAt);
      return signalDate >= startDate && signalDate <= endDate;
    });

    // Group signals by date, type, and severity
    const signalsByDateTypeSeverity = new Map<
      string,
      {
        count: number;
        severityScores: number[];
        date: Date;
        signalType: string;
        severity: 'low' | 'medium' | 'high';
      }
    >();

    const severityScoreMap = { low: 1, medium: 2, high: 3 };

    for (const signal of filteredSignals) {
      const dateKey = this.getDateKey(signal.detectedAt);
      const typeKey = `${dateKey}:${signal.signalType}:${signal.severity}`;

      if (!signalsByDateTypeSeverity.has(typeKey)) {
        signalsByDateTypeSeverity.set(typeKey, {
          count: 0,
          severityScores: [],
          date: this.getDateFromKey(dateKey),
          signalType: signal.signalType,
          severity: signal.severity,
        });
      }

      const entry = signalsByDateTypeSeverity.get(typeKey)!;
      entry.count += 1;
      entry.severityScores.push(severityScoreMap[signal.severity]);
    }

    // Convert to result format
    return Array.from(signalsByDateTypeSeverity.values())
      .map((entry) => ({
        date: entry.date,
        signalType: entry.signalType,
        count: entry.count,
        severity: entry.severity,
        averageSeverityScore: entry.severityScores.length > 0
          ? entry.severityScores.reduce((a, b) => a + b, 0) / entry.severityScores.length
          : 0,
      }))
      .sort(
        (a, b) =>
          a.date.getTime() - b.date.getTime() ||
          a.signalType.localeCompare(b.signalType) ||
          b.count - a.count,
      );
  }

  /**
   * Helper: Extract date key (YYYY-MM-DD) from date.
   * Used for grouping metrics by day.
   */
  private getDateKey(date: Date): string {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper: Convert date key (YYYY-MM-DD) back to Date object (UTC).
   * Used for reconstructing dates from grouped metrics.
   */
  private getDateFromKey(key: string): Date {
    return new Date(`${key}T00:00:00Z`);
  }
}
