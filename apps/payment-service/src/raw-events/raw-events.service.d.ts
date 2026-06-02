import { PrismaClient } from '../../../generated/prisma-client-payment';
export interface StoreEventInput {
    provider: string;
    eventType: string;
    providerReference: string;
    headersJson: Record<string, any>;
    payloadJson: Record<string, any>;
    receivedAt: Date;
    verificationStatus?: string;
}
export declare class RawEventsService {
    private prisma;
    constructor(prisma: PrismaClient);
    storeEvent(input: StoreEventInput): Promise<{
        createdAt: Date;
        id: string;
        provider: string;
        eventType: string;
        providerReference: string;
        headersJson: import("../../../generated/prisma-client-payment/runtime/library").JsonValue;
        payloadJson: import("../../../generated/prisma-client-payment/runtime/library").JsonValue;
        receivedAt: Date;
        verificationStatus: string;
    }>;
    findByProviderReference(providerReference: string): Promise<{
        createdAt: Date;
        id: string;
        provider: string;
        eventType: string;
        providerReference: string;
        headersJson: import("../../../generated/prisma-client-payment/runtime/library").JsonValue;
        payloadJson: import("../../../generated/prisma-client-payment/runtime/library").JsonValue;
        receivedAt: Date;
        verificationStatus: string;
    }[]>;
}
