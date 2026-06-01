import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Represents a normalized transaction in the standard internal format.
 * All provider-specific data is mapped to this common schema.
 */
export interface NormalizedTransaction {
  provider: string;
  providerReference: string;
  amount: number;
  currency: string;
  payerReference: string;
  status: string;
  eventTime: Date;
}

/**
 * Interface for provider-specific mappers.
 * Allows extensibility for different payment providers.
 */
export interface ITransactionProvider {
  /**
   * Map a provider payload to NormalizedTransaction format.
   * @param payload - The provider-specific webhook payload
   * @returns NormalizedTransaction or throws if required fields are missing
   */
  map(payload: Record<string, any>): NormalizedTransaction;
}

/**
 * MTN-specific transaction provider mapper.
 * Transforms MTN webhook payloads to normalized format.
 */
class MtnProvider implements ITransactionProvider {
  private readonly PROVIDER_NAME = 'mtn';

  map(payload: Record<string, any>): NormalizedTransaction {
    this.validateRequiredFields(payload);

    const payerReference = this.extractPayerReference(payload);
    if (!payerReference) {
      throw new BadRequestException(
        'Required field missing: payerReference (externalId) in MTN payload',
      );
    }

    return {
      provider: this.PROVIDER_NAME,
      providerReference: payload.transactionId,
      amount: payload.amount,
      currency: payload.currency,
      payerReference,
      status: this.normalizeStatus(payload.status),
      eventTime: this.extractEventTime(payload),
    };
  }

  /**
   * Validate that all required fields are present in MTN payload.
   */
  private validateRequiredFields(payload: Record<string, any>): void {
    const requiredFields = ['transactionId', 'amount', 'currency', 'status'];

    for (const field of requiredFields) {
      if (payload[field] === undefined || payload[field] === null) {
        throw new BadRequestException(
          `Required field missing: ${field} in MTN payload`,
        );
      }
    }

    // Validate field types
    if (typeof payload.transactionId !== 'string') {
      throw new BadRequestException('transactionId must be a string');
    }
    if (typeof payload.amount !== 'number' || !isFinite(payload.amount)) {
      throw new BadRequestException('amount must be a finite number');
    }
    if (typeof payload.currency !== 'string') {
      throw new BadRequestException('currency must be a string');
    }
    if (typeof payload.status !== 'string') {
      throw new BadRequestException('status must be a string');
    }
  }

  /**
   * Extract payer reference from MTN payload.
   * Tries externalId first, then falls back to payer object structure.
   */
  private extractPayerReference(payload: Record<string, any>): string | null {
    // Try externalId first
    if (payload.externalId && typeof payload.externalId === 'string') {
      return payload.externalId;
    }

    // Try extracting from payer object
    if (payload.payer && typeof payload.payer === 'object') {
      if (
        payload.payer.partyId &&
        typeof payload.payer.partyId === 'string'
      ) {
        return payload.payer.partyId;
      }
      if (
        payload.payer.partyIdType &&
        payload.payer.partyId &&
        typeof payload.payer.partyId === 'string'
      ) {
        return payload.payer.partyId;
      }
    }

    return null;
  }

  /**
   * Extract and normalize event time from MTN payload.
   * Uses timestamp field if available, falls back to requestTimestamp.
   */
  private extractEventTime(payload: Record<string, any>): Date {
    let timeString = payload.timestamp || payload.requestTimestamp;

    if (!timeString) {
      throw new BadRequestException(
        'Required field missing: timestamp or requestTimestamp in MTN payload',
      );
    }

    const date = new Date(timeString);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(
        `Invalid date format for eventTime: ${timeString}`,
      );
    }

    return date;
  }

  /**
   * Normalize MTN status to internal representation.
   * Handles common MTN status values.
   */
  private normalizeStatus(mtnStatus: string): string {
    const statusMap: Record<string, string> = {
      SUCCESSFUL: 'completed',
      SUCCESS: 'completed',
      FAILED: 'failed',
      PENDING: 'pending',
      REJECTED: 'rejected',
    };

    return statusMap[mtnStatus.toUpperCase()] || mtnStatus.toLowerCase();
  }
}

/**
 * NormalizationService provides transaction normalization across providers.
 *
 * Responsibilities:
 * - Route payloads to the appropriate provider mapper
 * - Normalize transactions to internal standard format
 * - Validate required fields
 * - Provide extensibility for new providers
 *
 * Does NOT:
 * - Persist data
 * - Reconcile transactions
 * - Send notifications
 */
@Injectable()
export class NormalizationService {
  private providers: Map<string, ITransactionProvider>;

  constructor() {
    this.providers = new Map();
    this.registerProvider('mtn', new MtnProvider());
  }

  /**
   * Register a new provider mapper.
   * Allows runtime registration of new payment providers.
   */
  registerProvider(providerName: string, provider: ITransactionProvider): void {
    this.providers.set(providerName.toLowerCase(), provider);
  }

  /**
   * Normalize a transaction from a provider-specific payload.
   *
   * @param provider - The provider name (e.g., 'mtn')
   * @param payload - The provider-specific webhook payload
   * @returns NormalizedTransaction in standard format
   * @throws BadRequestException if provider not supported or validation fails
   */
  normalize(
    provider: string,
    payload: Record<string, any>,
  ): NormalizedTransaction {
    const providerMapper = this.providers.get(provider.toLowerCase());

    if (!providerMapper) {
      throw new BadRequestException(
        `Unsupported provider: ${provider}. Supported providers: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }

    return providerMapper.map(payload);
  }

  /**
   * Get list of currently supported providers.
   */
  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
