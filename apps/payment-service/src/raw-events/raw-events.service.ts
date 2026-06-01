import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface StoreEventInput {
  provider: string;
  eventType: string;
  providerReference: string;
  headersJson: Record<string, any>;
  payloadJson: Record<string, any>;
  receivedAt: Date;
  verificationStatus?: string;
}

@Injectable()
export class RawEventsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Store a raw financial event before processing.
   * Records are immutable once created.
   */
  async storeEvent(input: StoreEventInput) {
    return this.prisma.rawFinancialEvent.create({
      data: {
        provider: input.provider,
        eventType: input.eventType,
        providerReference: input.providerReference,
        headersJson: input.headersJson,
        payloadJson: input.payloadJson,
        receivedAt: input.receivedAt,
        verificationStatus: input.verificationStatus ?? 'pending',
      },
    });
  }

  /**
   * Find raw financial events by provider reference.
   * Provider reference is indexed for efficient lookups.
   */
  async findByProviderReference(providerReference: string) {
    return this.prisma.rawFinancialEvent.findMany({
      where: {
        providerReference,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
