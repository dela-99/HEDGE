export interface DailyRevenueMetric {
    date: Date;
    currency: string;
    totalAmount: number;
    transactionCount: number;
    averageAmount: number;
}
export interface FailedTransactionMetric {
    date: Date;
    failureReason: string;
    count: number;
    percentage: number;
}
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
export interface FraudSignalCountMetric {
    date: Date;
    signalType: string;
    count: number;
    severity: 'low' | 'medium' | 'high';
    averageSeverityScore: number;
}
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
export interface TransactionForAnalytics {
    id: string;
    provider: string;
    amount: number;
    currency: string;
    transactionDate: Date;
    status: string;
    failureReason?: string;
}
export interface ReconciliationResultForAnalytics {
    id: string;
    transactionId: string;
    status: 'MATCHED' | 'PENDING' | 'MISMATCHED' | 'DUPLICATE';
    eventTime: Date;
    matchScore?: number;
}
export interface FraudSignalForAnalytics {
    id: string;
    transactionId: string;
    signalType: string;
    severity: 'low' | 'medium' | 'high';
    detectedAt: Date;
}
export declare class AnalyticsService {
    generateDailyMetrics(transactions: TransactionForAnalytics[], startDate: Date, endDate: Date): DailyMetrics;
    generateReconciliationMetrics(reconciliationResults: ReconciliationResultForAnalytics[], startDate: Date, endDate: Date): ReconciliationMetrics;
    generateFraudSignalMetrics(fraudSignals: FraudSignalForAnalytics[], startDate: Date, endDate: Date): FraudSignalCountMetric[];
    private getDateKey;
    private getDateFromKey;
}
