import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Represents a transaction extracted from a verified webhook event.
 * This is the output of the ingestion pipeline.
 */
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

/**
 * Represents a verified raw financial event ready for ingestion.
 */
export interface VerifiedEvent {
  id: string;
  provider: string;
  providerReference: string;
  payloadJson: Record<string, any>;
  headersJson: Record<string, any>;
  receivedAt: Date;
  verificationStatus: string;
}

/**
 * Result of the ingestion operation.
 */
export interface IngestionResult {
  candidate: TransactionCandidate;
  rawEventId: string;
  extractedFields: string[];
}

/**
 * IngestionService handles the transformation of verified webhook events
 * into transaction candidates.
 *
 * Responsibilities:
 * - Accept verified events
 * - Extract provider data
 * - Validate required fields
 * - Create ingestion result object with TransactionCandidate
 *
 * Does NOT:
 * - Reconcile transactions
 * - Send notifications
 * - Perform analysis
 */
@Injectable()
export class IngestionService {
  /**
   * Ingest a verified event and extract transaction data.
   *
   * @param event - A verified raw financial event
   * @returns IngestionResult containing the extracted TransactionCandidate
   * @throws BadRequestException if required fields are missing
   */
  ingest(event: VerifiedEvent): IngestionResult {
    // Validate that the event is marked as verified
    if (event.verificationStatus !== 'verified') {
      throw new BadRequestException(
        `Event must be verified before ingestion. Current status: ${event.verificationStatus}`,
      );
    }

    // Extract and validate required fields from payload
    const payload = event.payloadJson || {};
    const extractedFields: string[] = [];

    const amount = this.extractAmount(payload);
    if (amount === null) {
      throw new BadRequestException(
        'Required field missing: amount or value in event payload',
      );
    }
    extractedFields.push('amount');

    const currency = this.extractCurrency(payload);
    if (!currency) {
      throw new BadRequestException(
        'Required field missing: currency in event payload',
      );
    }
    extractedFields.push('currency');

    const transactionDate = this.extractTransactionDate(payload, event.receivedAt);
    if (!transactionDate) {
      throw new BadRequestException(
        'Required field missing: transaction date or timestamp in event payload',
      );
    }
    extractedFields.push('transactionDate');

    // Extract optional fields
    const description = this.extractDescription(payload);
    if (description) {
      extractedFields.push('description');
    }

    // Create the transaction candidate
    const candidate: TransactionCandidate = {
      id: this.generateCandidateId(event.provider, event.providerReference),
      provider: event.provider,
      providerReference: event.providerReference,
      amount,
      currency,
      transactionDate,
      description,
      status: 'candidate',
      metadata: {
        providerHeaders: event.headersJson,
        providerPayload: payload,
      },
      ingestedAt: new Date(),
    };

    return {
      candidate,
      rawEventId: event.id,
      extractedFields,
    };
  }

  /**
   * Extract amount from provider payload.
   * Supports common field names: amount, value, total, transactionAmount
   */
  private extractAmount(payload: Record<string, any>): number | null {
    const amountCandidates = ['amount', 'value', 'total', 'transactionAmount'];

    for (const field of amountCandidates) {
      const val = payload[field];
      if (val !== undefined && val !== null) {
        const num = Number(val);
        if (!isNaN(num) && num > 0) {
          return num;
        }
      }
    }

    return null;
  }

  /**
   * Extract currency from provider payload.
   * Supports common field names: currency, currencyCode, curr
   */
  private extractCurrency(payload: Record<string, any>): string | null {
    const currencyCandidates = ['currency', 'currencyCode', 'curr'];

    for (const field of currencyCandidates) {
      const val = payload[field];
      if (val && typeof val === 'string') {
        const currency = val.toUpperCase();
        // Validate it's a 3-letter ISO currency code
        if (/^[A-Z]{3}$/.test(currency)) {
          return currency;
        }
      }
    }

    return null;
  }

  /**
   * Extract transaction date from provider payload.
   * Falls back to receivedAt if not found in payload.
   * Supports common field names: timestamp, date, transactionDate, createdAt
   */
  private extractTransactionDate(
    payload: Record<string, any>,
    receivedAt: Date,
  ): Date | null {
    const dateCandidates = ['timestamp', 'date', 'transactionDate', 'createdAt'];

    for (const field of dateCandidates) {
      const val = payload[field];
      if (val !== undefined && val !== null) {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // Fall back to received at time
    return receivedAt;
  }

  /**
   * Extract description from provider payload.
   * Supports common field names: description, memo, note, reference
   */
  private extractDescription(payload: Record<string, any>): string | undefined {
    const descriptionCandidates = ['description', 'memo', 'note', 'reference'];

    for (const field of descriptionCandidates) {
      const val = payload[field];
      if (val && typeof val === 'string' && val.trim().length > 0) {
        return val.trim();
      }
    }

    return undefined;
  }

  /**
   * Generate a unique candidate ID from provider and reference.
   */
  private generateCandidateId(provider: string, providerReference: string): string {
    return `${provider}-${providerReference}-${Date.now()}`;
  }
}
