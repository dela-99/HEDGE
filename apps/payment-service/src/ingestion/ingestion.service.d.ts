export interface TransactionCandidate {
    id: string;
    provider: string;
    providerReference: string;
    amount: number;
    currency: string;
    transactionDate: Date;
    description?: string;
    status: 'candidate';
    metadata: Record<string, any>;
    ingestedAt: Date;
}
export interface VerifiedEvent {
    id: string;
    provider: string;
    providerReference: string;
    payloadJson: Record<string, any>;
    headersJson: Record<string, any>;
    receivedAt: Date;
    verificationStatus: string;
}
export interface IngestionResult {
    candidate: TransactionCandidate;
    rawEventId: string;
    extractedFields: string[];
}
export declare class IngestionService {
    ingest(event: VerifiedEvent): IngestionResult;
    private extractAmount;
    private extractCurrency;
    private extractTransactionDate;
    private extractDescription;
    private generateCandidateId;
}
