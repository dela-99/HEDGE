export interface Transaction {
    transactionId: string;
    externalReference: string;
    amount: number;
    currency: string;
    merchantId: string;
    customerReference: string;
    provider: string;
    status: string;
    timestamp: Date;
}
export declare class TransactionGeneratorService {
    private readonly logger;
    private readonly providers;
    private readonly currencies;
    private readonly merchantIds;
    private seed;
    private seedMultiplier;
    private seedIncrement;
    private seedModulus;
    generateTransactions(count?: number, seed?: number): Transaction[];
    private determineStatus;
    private generateUniqueId;
    private generateRealisticAmount;
    private generateRealisticTimestamp;
    private random;
    private randomInt;
    private randomElement;
}
