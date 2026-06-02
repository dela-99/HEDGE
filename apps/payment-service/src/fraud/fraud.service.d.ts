export declare enum FraudSignalType {
    DUPLICATE_TRANSACTION = "DUPLICATE_TRANSACTION",
    UNUSUAL_AMOUNT = "UNUSUAL_AMOUNT",
    RAPID_REPEATED_ATTEMPTS = "RAPID_REPEATED_ATTEMPTS",
    UNKNOWN_REFERENCE = "UNKNOWN_REFERENCE"
}
export interface FraudSignal {
    signalType: FraudSignalType;
    description: string;
    severity: 'low' | 'medium' | 'high';
    detectedAt: Date;
    metadata?: Record<string, any>;
}
export interface TransactionForFraudAnalysis {
    id: string;
    provider: string;
    providerReference: string;
    amount: number;
    currency: string;
    transactionDate: Date;
    payerReference?: string;
    description?: string;
}
export declare class FraudService {
    private readonly DUPLICATE_WINDOW_MS;
    private readonly RAPID_ATTEMPTS_WINDOW_MS;
    private readonly RAPID_ATTEMPTS_THRESHOLD;
    private readonly MIN_TRANSACTIONS_FOR_AVERAGE;
    private readonly UNUSUAL_AMOUNT_MULTIPLIER;
    analyzTransaction(transaction: TransactionForFraudAnalysis, history?: TransactionForFraudAnalysis[]): FraudSignal[];
    private detectDuplicateTransaction;
    private detectUnusualAmount;
    private detectRapidRepeatedAttempts;
    private detectUnknownReference;
}
