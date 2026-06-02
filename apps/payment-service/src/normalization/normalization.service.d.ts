export interface NormalizedTransaction {
    provider: string;
    providerReference: string;
    amount: number;
    currency: string;
    payerReference: string;
    status: string;
    eventTime: Date;
}
export interface ITransactionProvider {
    map(payload: Record<string, any>): NormalizedTransaction;
}
export declare class NormalizationService {
    private providers;
    constructor();
    registerProvider(providerName: string, provider: ITransactionProvider): void;
    normalize(provider: string, payload: Record<string, any>): NormalizedTransaction;
    getSupportedProviders(): string[];
}
