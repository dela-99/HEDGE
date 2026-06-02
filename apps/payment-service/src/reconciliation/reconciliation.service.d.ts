export declare enum ReconciliationStatus {
    MATCHED = "MATCHED",
    PENDING = "PENDING",
    MISMATCHED = "MISMATCHED",
    DUPLICATE = "DUPLICATE"
}
export interface ReconciliationTransaction {
    id: string;
    provider: string;
    providerReference: string;
    amount: number;
    currency: string;
    payerReference: string;
    status: string;
    eventTime: Date;
}
export interface MatchResult {
    status: ReconciliationStatus;
    primaryTransaction: ReconciliationTransaction;
    counterpartTransactions?: ReconciliationTransaction[];
    mismatchReasons?: string[];
    matchScore?: number;
}
export interface DuplicateAnalysisResult {
    status: ReconciliationStatus;
    transaction: ReconciliationTransaction;
    duplicateTransactions?: ReconciliationTransaction[];
    duplicateCount: number;
}
export interface MismatchAnalysisResult {
    status: ReconciliationStatus;
    transaction: ReconciliationTransaction;
    mismatchedCounterparts?: ReconciliationTransaction[];
    mismatchReasons: string[];
}
export interface PendingAnalysisResult {
    status: ReconciliationStatus;
    transaction: ReconciliationTransaction;
    daysPending: number;
    lastActivity?: Date;
}
export declare class ReconciliationService {
    matchTransaction(primaryTransaction: ReconciliationTransaction, counterparts: ReconciliationTransaction[]): MatchResult;
    detectDuplicates(transaction: ReconciliationTransaction, allTransactions: ReconciliationTransaction[]): DuplicateAnalysisResult;
    detectMismatches(transaction1: ReconciliationTransaction, transaction2: ReconciliationTransaction): MismatchAnalysisResult;
    analyzePendingRecord(transaction: ReconciliationTransaction, referenceDate?: Date): PendingAnalysisResult;
    classifyTransaction(transaction: ReconciliationTransaction, allTransactions: ReconciliationTransaction[]): ReconciliationStatus;
    private isExactMatch;
    private isFuzzyMatch;
    private isNearDuplicate;
    private identifyMismatches;
}
