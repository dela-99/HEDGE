import { Injectable, Logger } from '@nestjs/common';

/**
 * Represents a transaction fixture for simulation purposes.
 */
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

/**
 * TransactionGeneratorService provides deterministic generation of realistic
 * transaction fixtures for simulation and testing purposes.
 *
 * Supports:
 * - Deterministic seed for reproducible output
 * - Realistic transaction amounts and timestamps
 * - Configurable transaction distribution (success/failure/duplicates/reversals/delayed/suspicious)
 * - Multiple providers and currencies
 */
@Injectable()
export class TransactionGeneratorService {
  private readonly logger = new Logger(TransactionGeneratorService.name);

  private readonly providers = ['mtn', 'airtel', 'vodafone', 'moov', 'orange'];
  private readonly currencies = ['USD', 'XOF', 'EUR', 'GBP', 'NGN'];
  private readonly merchantIds = [
    'MERCHANT-001',
    'MERCHANT-002',
    'MERCHANT-003',
    'MERCHANT-004',
    'MERCHANT-005',
    'MERCHANT-006',
    'MERCHANT-007',
    'MERCHANT-008',
    'MERCHANT-009',
    'MERCHANT-010',
  ];

  private seed: number = 0;
  private seedMultiplier = 9301;
  private seedIncrement = 49297;
  private seedModulus = 233280;

  /**
   * Generate realistic transaction fixtures.
   *
   * Distribution:
   * - 70% successful payments (status: "SUCCESSFUL")
   * - 10% failed payments (status: "FAILED")
   * - 5% duplicates (same transactionId, different timestamp)
   * - 5% reversals (status: "REVERSED")
   * - 5% delayed settlements (status: "PENDING")
   * - 5% suspicious/fraud events (status: "SUSPICIOUS")
   *
   * @param count - Number of transactions to generate (default: 1000)
   * @param seed - Optional seed for deterministic generation
   * @returns Array of generated transactions
   */
  generateTransactions(count: number = 1000, seed?: number): Transaction[] {
    this.seed = seed || Date.now();
    const transactions: Transaction[] = [];
    const usedIds = new Set<string>();
    const duplicateIndices: number[] = [];

    // Calculate distribution counts
    const successCount = Math.floor(count * 0.7);
    const failedCount = Math.floor(count * 0.1);
    const duplicateCount = Math.floor(count * 0.05);
    const reversalCount = Math.floor(count * 0.05);
    const delayedCount = Math.floor(count * 0.05);
    const suspiciousCount = count - successCount - failedCount - duplicateCount - reversalCount - delayedCount;

    // Generate base transactions
    for (let i = 0; i < count; i++) {
      let transactionId: string;
      let isOriginalDuplicate = false;

      // Determine if this should be a duplicate (use existing ID)
      if (i < duplicateCount && duplicateIndices.length > 0) {
        // For duplicates, reuse an earlier transaction's ID
        const originalIndex = duplicateIndices[i % duplicateIndices.length];
        transactionId = transactions[originalIndex].transactionId;
      } else {
        // Generate unique transaction ID
        transactionId = this.generateUniqueId('TXN', usedIds);
        if (i < duplicateCount + successCount) {
          // Mark some successful transactions as potential duplicates
          duplicateIndices.push(i);
        }
        isOriginalDuplicate = false;
      }

      const transaction: Transaction = {
        transactionId,
        externalReference: this.generateUniqueId('EXT', new Set()),
        amount: this.generateRealisticAmount(),
        currency: this.randomElement(this.currencies),
        merchantId: this.randomElement(this.merchantIds),
        customerReference: this.generateUniqueId('CUST', new Set()),
        provider: this.randomElement(this.providers),
        status: this.determineStatus(i, count, successCount, failedCount, duplicateCount, reversalCount, delayedCount),
        timestamp: this.generateRealisticTimestamp(),
      };

      transactions.push(transaction);
    }

    this.logger.log(`Generated ${count} transactions with deterministic seed: ${this.seed}`);
    return transactions;
  }

  /**
   * Determine transaction status based on distribution index.
   */
  private determineStatus(
    index: number,
    total: number,
    successCount: number,
    failedCount: number,
    duplicateCount: number,
    reversalCount: number,
    delayedCount: number,
  ): string {
    let currentIndex = 0;

    if (index < currentIndex + successCount) {
      return 'SUCCESSFUL';
    }
    currentIndex += successCount;

    if (index < currentIndex + failedCount) {
      return 'FAILED';
    }
    currentIndex += failedCount;

    if (index < currentIndex + duplicateCount) {
      return 'DUPLICATE';
    }
    currentIndex += duplicateCount;

    if (index < currentIndex + reversalCount) {
      return 'REVERSED';
    }
    currentIndex += reversalCount;

    if (index < currentIndex + delayedCount) {
      return 'PENDING';
    }

    return 'SUSPICIOUS';
  }

  /**
   * Generate a unique ID with given prefix.
   */
  private generateUniqueId(prefix: string, usedIds: Set<string>): string {
    let id: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      id = `${prefix}-${this.randomInt(100000, 999999)}`;
      attempts++;
    } while (usedIds.has(id) && attempts < maxAttempts);

    usedIds.add(id);
    return id;
  }

  /**
   * Generate a realistic transaction amount.
   * Range: 0.50 to 10,000.00 with realistic distribution.
   */
  private generateRealisticAmount(): number {
    const rand = this.random();

    // Weighted distribution:
    // 60% micro transactions (0.50 - 50)
    // 30% standard transactions (50 - 500)
    // 10% large transactions (500 - 10000)

    if (rand < 0.6) {
      return Math.round((this.random() * 49.5 + 0.5) * 100) / 100;
    } else if (rand < 0.9) {
      return Math.round((this.random() * 450 + 50) * 100) / 100;
    } else {
      return Math.round((this.random() * 9500 + 500) * 100) / 100;
    }
  }

  /**
   * Generate a realistic timestamp within the past 30 days.
   */
  private generateRealisticTimestamp(): Date {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const randomMs = this.randomInt(0, Math.floor(now.getTime() - thirtyDaysAgo.getTime()));
    return new Date(thirtyDaysAgo.getTime() + randomMs);
  }

  /**
   * Linear congruential generator for deterministic random numbers.
   */
  private random(): number {
    this.seed = (this.seed * this.seedMultiplier + this.seedIncrement) % this.seedModulus;
    return this.seed / this.seedModulus;
  }

  /**
   * Generate a random integer between min (inclusive) and max (inclusive).
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Select a random element from an array.
   */
  private randomElement<T>(array: T[]): T {
    const index = this.randomInt(0, array.length - 1);
    return array[index];
  }
}
