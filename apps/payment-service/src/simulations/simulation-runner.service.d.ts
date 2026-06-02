import { RawEventsService } from '../raw-events/raw-events.service';
import { IngestionService, TransactionCandidate } from '../ingestion/ingestion.service';
import { NormalizationService, NormalizedTransaction } from '../normalization/normalization.service';
import { FraudService, FraudSignal } from '../fraud/fraud.service';
import { ReconciliationService, ReconciliationStatus } from '../reconciliation/reconciliation.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Transaction } from './generators/transaction-generator.service';
export interface PipelineEventResult {
    transactionId: string;
    provider: string;
    status: 'success' | 'failure';
    originalStatus: string;
    amount: number;
    currency: string;
    rawEventId?: string;
    ingestedCandidate?: TransactionCandidate;
    normalizedTransaction?: NormalizedTransaction;
    fraudSignals: FraudSignal[];
    reconciliationStatus?: ReconciliationStatus;
    errors: string[];
    failedAtStage?: string;
    executedAt: Date;
}
export interface SimulationSummary {
    processed: number;
    failed: number;
    duplicates: number;
    reversed: number;
    reconciled: number;
    fraudFlags: number;
    successCount: number;
    failedCount: number;
    duplicateCount: number;
    reversalCount: number;
    matchedCount: number;
    pendingCount: number;
    mismatchedCount: number;
    fraudSignalCount: number;
    pipelineResults: PipelineEventResult[];
    executedAt: Date;
    duration: number;
    analyticsMetrics?: {
        totalRevenue: number;
        totalTransactions: number;
        fraudRatePercent: number;
        matchRatePercent: number;
    };
}
export declare class SimulationRunnerService {
    private rawEventsService;
    private ingestionService;
    private normalizationService;
    private fraudService;
    private reconciliationService;
    private analyticsService;
    private readonly logger;
    constructor(rawEventsService: RawEventsService, ingestionService: IngestionService, normalizationService: NormalizationService, fraudService: FraudService, reconciliationService: ReconciliationService, analyticsService: AnalyticsService);
    replayEvents(transactions: Transaction[]): Promise<SimulationSummary>;
    private replayTransaction;
    private createVerifiedEvent;
    private createPayloadJson;
    private determineEventType;
    private mapTransactionStatus;
    private createTransactionForFraudAnalysis;
    private createReconciliationTransaction;
    private extractPreviousTransactionsForFraud;
    private extractAllPreviousTransactions;
    private extractFailureStage;
    private calculateSummary;
}
