"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SimulationRunnerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationRunnerService = void 0;
const common_1 = require("@nestjs/common");
const raw_events_service_1 = require("../raw-events/raw-events.service");
const ingestion_service_1 = require("../ingestion/ingestion.service");
const normalization_service_1 = require("../normalization/normalization.service");
const fraud_service_1 = require("../fraud/fraud.service");
const reconciliation_service_1 = require("../reconciliation/reconciliation.service");
const analytics_service_1 = require("../analytics/analytics.service");
let SimulationRunnerService = SimulationRunnerService_1 = class SimulationRunnerService {
    rawEventsService;
    ingestionService;
    normalizationService;
    fraudService;
    reconciliationService;
    analyticsService;
    logger = new common_1.Logger(SimulationRunnerService_1.name);
    constructor(rawEventsService, ingestionService, normalizationService, fraudService, reconciliationService, analyticsService) {
        this.rawEventsService = rawEventsService;
        this.ingestionService = ingestionService;
        this.normalizationService = normalizationService;
        this.fraudService = fraudService;
        this.reconciliationService = reconciliationService;
        this.analyticsService = analyticsService;
    }
    async replayEvents(transactions) {
        const startTime = Date.now();
        const pipelineResults = [];
        this.logger.log(`Starting simulation replay of ${transactions.length} events`);
        for (const transaction of transactions) {
            const result = await this.replayTransaction(transaction, pipelineResults);
            pipelineResults.push(result);
        }
        const duration = Date.now() - startTime;
        const summary = this.calculateSummary(pipelineResults, duration);
        this.logger.log(`Simulation completed. Processed: ${summary.processed}, Failed: ${summary.failed}`);
        return summary;
    }
    async replayTransaction(transaction, previousResults) {
        const result = {
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
            this.logger.debug(`[${transaction.transactionId}] Stage 1: Verification`);
            const verifiedEvent = this.createVerifiedEvent(transaction);
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
            this.logger.debug(`[${transaction.transactionId}] Raw event stored: ${rawEvent.id}`);
            this.logger.debug(`[${transaction.transactionId}] Stage 3: Ingestion`);
            const ingestionResult = this.ingestionService.ingest(verifiedEvent);
            result.ingestedCandidate = ingestionResult.candidate;
            this.logger.debug(`[${transaction.transactionId}] Transaction ingested: ${ingestionResult.candidate.id}`);
            this.logger.debug(`[${transaction.transactionId}] Stage 4: Normalization`);
            const normalizedTransaction = this.normalizationService.normalize(transaction.provider, this.createPayloadJson(transaction));
            result.normalizedTransaction = normalizedTransaction;
            this.logger.debug(`[${transaction.transactionId}] Transaction normalized`);
            this.logger.debug(`[${transaction.transactionId}] Stage 5: Fraud Checks`);
            const fraudAnalysisInput = this.createTransactionForFraudAnalysis(ingestionResult.candidate, normalizedTransaction);
            const previousTransactions = this.extractPreviousTransactionsForFraud(previousResults);
            const fraudSignals = this.fraudService.analyzTransaction(fraudAnalysisInput, previousTransactions);
            result.fraudSignals = fraudSignals;
            this.logger.debug(`[${transaction.transactionId}] Fraud analysis complete: ${fraudSignals.length} signals`);
            this.logger.debug(`[${transaction.transactionId}] Stage 6: Reconciliation`);
            const reconciliationInput = this.createReconciliationTransaction(normalizedTransaction);
            const allPreviousTransactions = this.extractAllPreviousTransactions(previousResults);
            const matchResult = this.reconciliationService.matchTransaction(reconciliationInput, allPreviousTransactions);
            result.reconciliationStatus = matchResult.status;
            this.logger.debug(`[${transaction.transactionId}] Reconciliation status: ${matchResult.status}`);
            this.logger.debug(`[${transaction.transactionId}] Stage 7: Analytics`);
            this.logger.debug(`[${transaction.transactionId}] Analytics would aggregate results`);
            result.status = 'success';
            this.logger.log(`[${transaction.transactionId}] Pipeline completed successfully`);
        }
        catch (error) {
            result.status = 'failure';
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(errorMessage);
            result.failedAtStage = this.extractFailureStage(errorMessage);
            this.logger.error(`[${transaction.transactionId}] Pipeline failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
        }
        return result;
    }
    createVerifiedEvent(transaction) {
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
    createPayloadJson(transaction) {
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
    determineEventType(transaction) {
        const statusMap = {
            SUCCESSFUL: 'payment.completed',
            FAILED: 'payment.failed',
            DUPLICATE: 'payment.duplicate',
            REVERSED: 'payment.reversed',
            PENDING: 'payment.pending',
            SUSPICIOUS: 'payment.suspicious',
        };
        return statusMap[transaction.status] || 'payment.received';
    }
    mapTransactionStatus(status) {
        const statusMap = {
            SUCCESSFUL: 'SUCCESS',
            FAILED: 'FAILED',
            DUPLICATE: 'DUPLICATE',
            REVERSED: 'REVERSED',
            PENDING: 'PENDING',
            SUSPICIOUS: 'SUSPICIOUS',
        };
        return statusMap[status] || status;
    }
    createTransactionForFraudAnalysis(candidate, normalized) {
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
    createReconciliationTransaction(normalized) {
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
    extractPreviousTransactionsForFraud(previousResults) {
        return previousResults
            .filter((result) => result.status === 'success' &&
            result.normalizedTransaction &&
            result.ingestedCandidate)
            .map((result) => this.createTransactionForFraudAnalysis(result.ingestedCandidate, result.normalizedTransaction));
    }
    extractAllPreviousTransactions(previousResults) {
        return previousResults
            .filter((result) => result.status === 'success' && result.normalizedTransaction)
            .map((result) => this.createReconciliationTransaction(result.normalizedTransaction));
    }
    extractFailureStage(errorMessage) {
        if (errorMessage.includes('verified'))
            return 'Verification';
        if (errorMessage.includes('Raw'))
            return 'Raw Event Storage';
        if (errorMessage.includes('ingest'))
            return 'Ingestion';
        if (errorMessage.includes('normaliz'))
            return 'Normalization';
        if (errorMessage.includes('fraud'))
            return 'Fraud Checks';
        if (errorMessage.includes('reconcil'))
            return 'Reconciliation';
        if (errorMessage.includes('analytic'))
            return 'Analytics';
        return 'Unknown Stage';
    }
    calculateSummary(pipelineResults, duration) {
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
        for (const result of pipelineResults) {
            if (result.status === 'success') {
                processed++;
                successCount++;
                if (result.reconciliationStatus === 'MATCHED') {
                    reconciled++;
                    matchedCount++;
                }
                else if (result.reconciliationStatus === 'PENDING') {
                    pendingCount++;
                }
                else if (result.reconciliationStatus === 'MISMATCHED') {
                    mismatchedCount++;
                }
                if (result.fraudSignals.length > 0) {
                    fraudFlags++;
                    fraudSignalCount += result.fraudSignals.length;
                }
                totalRevenue += result.amount;
            }
            else {
                failed++;
                failedCount++;
            }
            if (result.originalStatus === 'DUPLICATE') {
                duplicates++;
                duplicateCount++;
            }
            if (result.originalStatus === 'REVERSED') {
                reversed++;
                reversalCount++;
            }
        }
        const fraudRatePercent = pipelineResults.length > 0
            ? (fraudSignalCount / pipelineResults.length) * 100
            : 0;
        const matchRatePercent = processed > 0 ? (matchedCount / processed) * 100 : 0;
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
};
exports.SimulationRunnerService = SimulationRunnerService;
exports.SimulationRunnerService = SimulationRunnerService = SimulationRunnerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [raw_events_service_1.RawEventsService,
        ingestion_service_1.IngestionService,
        normalization_service_1.NormalizationService,
        fraud_service_1.FraudService,
        reconciliation_service_1.ReconciliationService,
        analytics_service_1.AnalyticsService])
], SimulationRunnerService);
//# sourceMappingURL=simulation-runner.service.js.map