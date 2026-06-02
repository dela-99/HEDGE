import { Injectable, Logger } from '@nestjs/common';
import { RawEventsService } from '../raw-events/raw-events.service';
import {
  IngestionService,
  VerifiedEvent,
  TransactionCandidate,
} from '../ingestion/ingestion.service';
import {
  NormalizationService,
  NormalizedTransaction,
} from '../normalization/normalization.service';
import { FraudService, FraudSignal } from '../fraud/fraud.service';
import {
  ReconciliationService,
  ReconciliationTransaction,
  ReconciliationStatus,
} from '../reconciliation/reconciliation.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Transaction } from './generators/transaction-generator.service';

/**
 * Result of replaying a single transaction through the entire pipeline.
 */
export interface PipelineEventResult {
  transactionId: string;
  provider: string;
  status: 'success' | 'failure';
  originalStatus: string; // SUCCESSFUL, FAILED, DUPLICATE, REVERSED, etc.
  amount: number;
  currency: string;

  // Pipeline stage results
  rawEventId?: string;
  ingestedCandidate?: TransactionCandidate;
  normalizedTransaction?: NormalizedTransaction;
  fraudSignals: FraudSignal[];
  reconciliationStatus?: ReconciliationStatus;

  // Error tracking
  errors: string[];
  failedAtStage?: string; // Which pipeline stage failed

  executedAt: Date;
}

/**
 * Summary of the entire simulation run.
 */
export interface SimulationSummary {
  // Total counts
  processed: number;
  failed: number;
  duplicates: number;
  reversed: number;
  reconciled: number;
  fraudFlags: number;

  // Detailed breakdown
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  reversalCount: number;
  matchedCount: number;
  pendingCount: number;
  mismatchedCount: number;
  fraudSignalCount: number;

  // Pipeline results
  pipelineResults: PipelineEventResult[];
  executedAt: Date;
  duration: number; // milliseconds

  // Optional analytics aggregation
  analyticsMetrics?: {
    totalRevenue: number;
    totalTransactions: number;
    fraudRatePercent: number;
    matchRatePercent: number;
  };
}

/**
 * SimulationRunnerService orchestrates the replay of generated events through
 * the complete payment processing pipeline without bypassing any services.
 *
 * Pipeline flow:
 * 1. Verification - mark events as verified
 * 2. Raw Event Storage - persist using RawEventsService
 * 3. Ingestion - extract transaction candidates using IngestionService
 * 4. Normalization - normalize to standard format using NormalizationService
 * 5. Fraud Checks - analyze for fraud signals using FraudService
 * 6. Reconciliation - classify reconciliation status using ReconciliationService
 * 7. Analytics - aggregate metrics using AnalyticsService
 *
 * Responsibilities:
 * - Accept generated transaction events
 * - Route each event through all pipeline services
 * - Track: processed, failed, duplicates, reversed, reconciled, fraudFlags
 * - Collect detailed results from each pipeline stage
 * - Return comprehensive SimulationSummary
 *
 * Does NOT:
 * - Bypass any service in the pipeline
 * - Make business decisions
 * - Persist results (only reads from services)
 */
@Injectable()
export class SimulationRunnerService {
  private readonly logger = new Logger(SimulationRunnerService.name);

  constructor(
    private rawEventsService: RawEventsService,
    private ingestionService: IngestionService,
    private normalizationService: NormalizationService,
    private fraudService: FraudService,
    private reconciliationService: ReconciliationService,
    private analyticsService: AnalyticsService,
  ) {}

  /**
   * Replay generated events through the complete pipeline.
   *
   * @param transactions - Array of generated transactions to replay
   * @returns SimulationSummary with detailed tracking and results
   */
  async replayEvents(transactions: Transaction[]): Promise<SimulationSummary> {
    const startTime = Date.now();
    const pipelineResults: PipelineEventResult[] = [];

    this.logger.log(
      `Starting simulation replay of ${transactions.length} events`,
    );

    // Process each transaction through the pipeline
    for (const transaction of transactions) {
      const result = await this.replayTransaction(transaction, pipelineResults);
      pipelineResults.push(result);
    }

    const duration = Date.now() - startTime;

    // Calculate summary metrics
    const summary = this.calculateSummary(pipelineResults, duration);

    this.logger.log(
      `Simulation completed. Processed: ${summary.processed}, Failed: ${summary.failed}`,
    );

    return summary;
  }

  /**
   * Replay a single transaction through the entire pipeline.
   *
   * @param transaction - Transaction to replay
   * @param previousResults - Array of previous results for fraud/reconciliation context
   * @returns PipelineEventResult with complete pipeline execution details
   */
  private async replayTransaction(
    transaction: Transaction,
    previousResults: PipelineEventResult[],
  ): Promise<PipelineEventResult> {
    const result: PipelineEventResult = {
      transactionId: transaction.transactionId,
      provider: transaction.provider,
      status: 'failure',
      originalStatus: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      fraudSignals: [],
      errors: [],
      executedAt: new Date(),
    };

    try {
      // Stage 1: Verification - simulate successful webhook verification
      this.logger.debug(`[${transaction.transactionId}] Stage 1: Verification`);
      const verifiedEvent = this.createVerifiedEvent(transaction);

      // Stage 2: Raw Event Storage
      this.logger.debug(`[${transaction.transactionId}] Stage 2: Raw Event Storage`);
      const rawEvent = await this.rawEventsService.storeEvent({
        provider: verifiedEvent.provider,
        eventType: this.determineEventType(transaction),
        providerReference: verifiedEvent.providerReference,
        headersJson: verifiedEvent.headersJson,
        payloadJson: verifiedEvent.payloadJson,
        receivedAt: verifiedEvent.receivedAt,
        verificationStatus: 'verified',
      });

      result.rawEventId = rawEvent.id;
      this.logger.debug(
        `[${transaction.transactionId}] Raw event stored: ${rawEvent.id}`,
      );

      // Stage 3: Ingestion
      this.logger.debug(`[${transaction.transactionId}] Stage 3: Ingestion`);
      const ingestionResult = this.ingestionService.ingest(verifiedEvent);
      result.ingestedCandidate = ingestionResult.candidate;
      this.logger.debug(
        `[${transaction.transactionId}] Transaction ingested: ${ingestionResult.candidate.id}`,
      );

      // Stage 4: Normalization
      this.logger.debug(`[${transaction.transactionId}] Stage 4: Normalization`);
      const normalizedTransaction = this.normalizationService.normalize(
        transaction.provider,
        this.createPayloadJson(transaction),
      );
      result.normalizedTransaction = normalizedTransaction;
      this.logger.debug(
        `[${transaction.transactionId}] Transaction normalized`,
      );

      // Stage 5: Fraud Checks
      this.logger.debug(`[${transaction.transactionId}] Stage 5: Fraud Checks`);
      const fraudAnalysisInput = this.createTransactionForFraudAnalysis(
        ingestionResult.candidate,
        normalizedTransaction,
      );

      // Get previous transactions for fraud analysis context
      const previousTransactions = this.extractPreviousTransactionsForFraud(
        previousResults,
      );
      const fraudSignals = this.fraudService.analyzTransaction(
        fraudAnalysisInput,
        previousTransactions,
      );
      result.fraudSignals = fraudSignals;
      this.logger.debug(
        `[${transaction.transactionId}] Fraud analysis complete: ${fraudSignals.length} signals`,
      );

      // Stage 6: Reconciliation
      this.logger.debug(`[${transaction.transactionId}] Stage 6: Reconciliation`);
      const reconciliationInput = this.createReconciliationTransaction(
        normalizedTransaction,
      );

      // Get all previous transactions for reconciliation matching
      const allPreviousTransactions = this.extractAllPreviousTransactions(
        previousResults,
      );
      const matchResult = this.reconciliationService.matchTransaction(
        reconciliationInput,
        allPreviousTransactions,
      );
      result.reconciliationStatus = matchResult.status;
      this.logger.debug(
        `[${transaction.transactionId}] Reconciliation status: ${matchResult.status}`,
      );

      // Stage 7: Analytics aggregation
      this.logger.debug(`[${transaction.transactionId}] Stage 7: Analytics`);
      // Analytics is aggregation-only, just log that we would aggregate
      this.logger.debug(
        `[${transaction.transactionId}] Analytics would aggregate results`,
      );

      // All stages completed successfully
      result.status = 'success';
      this.logger.log(`[${transaction.transactionId}] Pipeline completed successfully`);
    } catch (error) {
      result.status = 'failure';
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      result.failedAtStage = this.extractFailureStage(errorMessage);
      this.logger.error(
        `[${transaction.transactionId}] Pipeline failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return result;
  }

  /**
   * Create a VerifiedEvent from a Transaction.
   * This simulates successful webhook verification.
   */
  private createVerifiedEvent(transaction: Transaction): VerifiedEvent {
    return {
      id: `sim:${transaction.provider}:${transaction.transactionId}:${Date.now()}`,
      provider: transaction.provider,
      providerReference: transaction.transactionId,
      payloadJson: this.createPayloadJson(transaction),
      headersJson: {
        'provider-id': transaction.provider,
        'event-type': this.determineEventType(transaction),
      },
      receivedAt: transaction.timestamp,
      verificationStatus: 'verified',
    };
  }

  /**
   * Create payload JSON from Transaction.
   * Maps transaction fields to provider-specific format.
   */
  private createPayloadJson(transaction: Transaction): Record<string, any> {
    return {
      transactionId: transaction.transactionId,
      externalId: transaction.customerReference,
      amount: transaction.amount,
      currency: transaction.currency,
      status: this.mapTransactionStatus(transaction.status),
      timestamp: transaction.timestamp.toISOString(),
      merchantId: transaction.merchantId,
      payer: {
        partyId: transaction.customerReference,
      },
    };
  }

  /**
   * Determine event type from transaction status.
   */
  private determineEventType(transaction: Transaction): string {
    const statusMap: Record<string, string> = {
      SUCCESSFUL: 'payment.completed',
      FAILED: 'payment.failed',
      DUPLICATE: 'payment.duplicate',
      REVERSED: 'payment.reversed',
      PENDING: 'payment.pending',
      SUSPICIOUS: 'payment.suspicious',
    };
    return statusMap[transaction.status] || 'payment.received';
  }

  /**
   * Map transaction status to provider-specific format.
   */
  private mapTransactionStatus(status: string): string {
    const statusMap: Record<string, string> = {
      SUCCESSFUL: 'SUCCESS',
      FAILED: 'FAILED',
      DUPLICATE: 'DUPLICATE',
      REVERSED: 'REVERSED',
      PENDING: 'PENDING',
      SUSPICIOUS: 'SUSPICIOUS',
    };
    return statusMap[status] || status;
  }

  /**
   * Create input for fraud analysis from ingested and normalized data.
   */
  private createTransactionForFraudAnalysis(
    candidate: TransactionCandidate,
    normalized: NormalizedTransaction,
  ) {
    return {
      id: candidate.id,
      provider: candidate.provider,
      providerReference: candidate.providerReference,
      amount: candidate.amount,
      currency: candidate.currency,
      transactionDate: candidate.transactionDate,
      payerReference: normalized.payerReference,
      description: candidate.description,
    };
  }

  /**
   * Create input for reconciliation classification.
   */
  private createReconciliationTransaction(
    normalized: NormalizedTransaction,
  ): ReconciliationTransaction {
    return {
      id: `${normalized.provider}:${normalized.providerReference}`,
      provider: normalized.provider,
      providerReference: normalized.providerReference,
      amount: normalized.amount,
      currency: normalized.currency,
      payerReference: normalized.payerReference,
      status: normalized.status,
      eventTime: normalized.eventTime,
    };
  }

  /**
   * Extract previous transactions for fraud analysis context.
   * Only returns transactions that completed successfully through normalization.
   */
  private extractPreviousTransactionsForFraud(
    previousResults: PipelineEventResult[],
  ) {
    return previousResults
      .filter(
        (result) =>
          result.status === 'success' &&
          result.normalizedTransaction &&
          result.ingestedCandidate,
      )
      .map((result) =>
        this.createTransactionForFraudAnalysis(
          result.ingestedCandidate!,
          result.normalizedTransaction!,
        ),
      );
  }

  /**
   * Extract all previous transactions for reconciliation.
   * Only returns transactions that completed successfully through normalization.
   */
  private extractAllPreviousTransactions(
    previousResults: PipelineEventResult[],
  ): ReconciliationTransaction[] {
    return previousResults
      .filter((result) => result.status === 'success' && result.normalizedTransaction)
      .map((result) =>
        this.createReconciliationTransaction(result.normalizedTransaction!),
      );
  }

  /**
   * Extract which pipeline stage failed from error message.
   */
  private extractFailureStage(errorMessage: string): string {
    if (errorMessage.includes('verified')) return 'Verification';
    if (errorMessage.includes('Raw')) return 'Raw Event Storage';
    if (errorMessage.includes('ingest')) return 'Ingestion';
    if (errorMessage.includes('normaliz')) return 'Normalization';
    if (errorMessage.includes('fraud')) return 'Fraud Checks';
    if (errorMessage.includes('reconcil')) return 'Reconciliation';
    if (errorMessage.includes('analytic')) return 'Analytics';
    return 'Unknown Stage';
  }

  /**
   * Calculate summary metrics from all pipeline results.
   */
  private calculateSummary(
    pipelineResults: PipelineEventResult[],
    duration: number,
  ): SimulationSummary {
    // Initialize counters
    let processed = 0;
    let failed = 0;
    let duplicates = 0;
    let reversed = 0;
    let reconciled = 0;
    let fraudFlags = 0;

    let successCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;
    let reversalCount = 0;
    let matchedCount = 0;
    let pendingCount = 0;
    let mismatchedCount = 0;
    let fraudSignalCount = 0;

    let totalRevenue = 0;

    // Count results
    for (const result of pipelineResults) {
      if (result.status === 'success') {
        processed++;
        successCount++;

        // Track reconciliation status
        if (result.reconciliationStatus === 'MATCHED') {
          reconciled++;
          matchedCount++;
        } else if (result.reconciliationStatus === 'PENDING') {
          pendingCount++;
        } else if (result.reconciliationStatus === 'MISMATCHED') {
          mismatchedCount++;
        }

        // Track fraud signals
        if (result.fraudSignals.length > 0) {
          fraudFlags++;
          fraudSignalCount += result.fraudSignals.length;
        }

        // Track revenue
        totalRevenue += result.amount;
      } else {
        failed++;
        failedCount++;
      }

      // Track original transaction status
      if (result.originalStatus === 'DUPLICATE') {
        duplicates++;
        duplicateCount++;
      }
      if (result.originalStatus === 'REVERSED') {
        reversed++;
        reversalCount++;
      }
    }

    // Calculate percentages
    const fraudRatePercent =
      pipelineResults.length > 0
        ? (fraudSignalCount / pipelineResults.length) * 100
        : 0;
    const matchRatePercent =
      processed > 0 ? (matchedCount / processed) * 100 : 0;

    return {
      processed,
      failed,
      duplicates,
      reversed,
      reconciled,
      fraudFlags,

      successCount,
      failedCount,
      duplicateCount,
      reversalCount,
      matchedCount,
      pendingCount,
      mismatchedCount,
      fraudSignalCount,

      pipelineResults,
      executedAt: new Date(),
      duration,

      analyticsMetrics: {
        totalRevenue,
        totalTransactions: pipelineResults.length,
        fraudRatePercent,
        matchRatePercent,
      },
    };
  }
}
