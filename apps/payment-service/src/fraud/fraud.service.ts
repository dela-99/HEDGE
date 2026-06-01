import { Injectable } from '@nestjs/common';

/**
 * Enum for fraud signal types.
 * Represents different types of fraudulent or suspicious transaction patterns.
 */
export enum FraudSignalType {
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  UNUSUAL_AMOUNT = 'UNUSUAL_AMOUNT',
  RAPID_REPEATED_ATTEMPTS = 'RAPID_REPEATED_ATTEMPTS',
  UNKNOWN_REFERENCE = 'UNKNOWN_REFERENCE',
}

/**
 * Represents a fraud signal detected on a transaction.
 * Signals indicate potential fraud or suspicious activity without blocking transactions.
 */
export interface FraudSignal {
  /**
   * The type of fraud signal detected
   */
  signalType: FraudSignalType;

  /**
   * Human-readable description of the signal
   */
  description: string;

  /**
   * Severity level: 'low', 'medium', or 'high'
   */
  severity: 'low' | 'medium' | 'high';

  /**
   * Timestamp when the signal was generated
   */
  detectedAt: Date;

  /**
   * Optional metadata for the signal
   */
  metadata?: Record<string, any>;
}

/**
 * Transaction data used for fraud signal generation.
 * Simplified interface containing fields needed for fraud detection.
 */
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

/**
 * FraudService generates fraud signals for transactions.
 *
 * Responsibilities:
 * - Detect duplicate transactions
 * - Identify unusual amounts
 * - Detect rapid repeated attempts
 * - Flag unknown references
 *
 * Does NOT:
 * - Use machine learning
 * - Block transactions
 * - Persist signals
 * - Make business decisions
 */
@Injectable()
export class FraudService {
  /**
   * Analyze a transaction and generate fraud signals.
   *
   * @param transaction - The transaction to analyze
   * @param history - Optional array of recent transactions for comparison
   * @returns Array of FraudSignal objects detected on the transaction
   */
  analyzTransaction(
    transaction: TransactionForFraudAnalysis,
    history?: TransactionForFraudAnalysis[],
  ): FraudSignal[] {
    const signals: FraudSignal[] = [];

    // Check for duplicate transactions
    const duplicateSignal = this.detectDuplicateTransaction(transaction, history);
    if (duplicateSignal) {
      signals.push(duplicateSignal);
    }

    // Check for unusual amounts
    const unusualAmountSignal = this.detectUnusualAmount(transaction, history);
    if (unusualAmountSignal) {
      signals.push(unusualAmountSignal);
    }

    // Check for rapid repeated attempts
    const rapidAttemptsSignal = this.detectRapidRepeatedAttempts(transaction, history);
    if (rapidAttemptsSignal) {
      signals.push(rapidAttemptsSignal);
    }

    // Check for unknown reference
    const unknownRefSignal = this.detectUnknownReference(transaction);
    if (unknownRefSignal) {
      signals.push(unknownRefSignal);
    }

    return signals;
  }

  /**
   * Detect duplicate transactions.
   * Flags transactions that have the same provider reference and amount
   * within a short time window (5 minutes).
   *
   * @param transaction - The transaction to check
   * @param history - Recent transaction history
   * @returns FraudSignal if duplicate detected, null otherwise
   */
  private detectDuplicateTransaction(
    transaction: TransactionForFraudAnalysis,
    history?: TransactionForFraudAnalysis[],
  ): FraudSignal | null {
    if (!history || history.length === 0) {
      return null;
    }

    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const now = new Date();

    for (const historyTx of history) {
      // Check if same provider and reference
      if (
        historyTx.provider === transaction.provider &&
        historyTx.providerReference === transaction.providerReference
      ) {
        // Check if within 5 minute window
        const timeDiffMs = now.getTime() - historyTx.transactionDate.getTime();
        if (timeDiffMs > 0 && timeDiffMs <= FIVE_MINUTES_MS) {
          // Check if same amount
          if (historyTx.amount === transaction.amount) {
            return {
              signalType: FraudSignalType.DUPLICATE_TRANSACTION,
              description: `Duplicate transaction detected: same provider reference ${transaction.providerReference} and amount ${transaction.amount} ${transaction.currency} within 5 minutes`,
              severity: 'high',
              detectedAt: new Date(),
              metadata: {
                previousTransactionId: historyTx.id,
                timeSinceLastOccurrenceMs: timeDiffMs,
              },
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Detect unusual amounts.
   * Flags transactions with extreme amounts:
   * - Zero or negative amounts (unless explicitly allowed)
   * - Amounts significantly higher than recent average
   *
   * @param transaction - The transaction to check
   * @param history - Recent transaction history
   * @returns FraudSignal if unusual amount detected, null otherwise
   */
  private detectUnusualAmount(
    transaction: TransactionForFraudAnalysis,
    history?: TransactionForFraudAnalysis[],
  ): FraudSignal | null {
    // Check for zero amount (unusual but may be valid in some cases)
    if (transaction.amount === 0) {
      return {
        signalType: FraudSignalType.UNUSUAL_AMOUNT,
        description: `Zero-value transaction detected`,
        severity: 'low',
        detectedAt: new Date(),
        metadata: {
          amount: transaction.amount,
          currency: transaction.currency,
        },
      };
    }

    // Check for negative amount
    if (transaction.amount < 0) {
      return {
        signalType: FraudSignalType.UNUSUAL_AMOUNT,
        description: `Negative amount detected: ${transaction.amount} ${transaction.currency}`,
        severity: 'medium',
        detectedAt: new Date(),
        metadata: {
          amount: transaction.amount,
          currency: transaction.currency,
        },
      };
    }

    // Check for extremely high amounts compared to history
    if (history && history.length > 0) {
      const recentTransactions = history.filter(
        (tx) => tx.currency === transaction.currency,
      );

      if (recentTransactions.length >= 3) {
        const avgAmount =
          recentTransactions.reduce((sum, tx) => sum + tx.amount, 0) /
          recentTransactions.length;

        // Flag if amount is more than 5x the average
        const threshold = avgAmount * 5;
        if (transaction.amount > threshold) {
          return {
            signalType: FraudSignalType.UNUSUAL_AMOUNT,
            description: `Unusual amount detected: ${transaction.amount} ${transaction.currency} is significantly higher than recent average of ${avgAmount.toFixed(2)}`,
            severity: 'medium',
            detectedAt: new Date(),
            metadata: {
              amount: transaction.amount,
              currency: transaction.currency,
              recentAverage: avgAmount,
              threshold,
              transactionCount: recentTransactions.length,
            },
          };
        }
      }
    }

    return null;
  }

  /**
   * Detect rapid repeated attempts.
   * Flags multiple transactions from the same payer in a short time window (1 minute).
   * May indicate a compromised account or automated attack.
   *
   * @param transaction - The transaction to check
   * @param history - Recent transaction history
   * @returns FraudSignal if rapid attempts detected, null otherwise
   */
  private detectRapidRepeatedAttempts(
    transaction: TransactionForFraudAnalysis,
    history?: TransactionForFraudAnalysis[],
  ): FraudSignal | null {
    if (!history || history.length === 0 || !transaction.payerReference) {
      return null;
    }

    const ONE_MINUTE_MS = 60 * 1000;
    const now = new Date();

    // Count transactions from the same payer in the last minute
    const recentAttempts = history.filter((historyTx) => {
      if (historyTx.payerReference !== transaction.payerReference) {
        return false;
      }

      const timeDiffMs = now.getTime() - historyTx.transactionDate.getTime();
      return timeDiffMs > 0 && timeDiffMs <= ONE_MINUTE_MS;
    });

    // Flag if 3 or more attempts in 1 minute
    if (recentAttempts.length >= 2) {
      return {
        signalType: FraudSignalType.RAPID_REPEATED_ATTEMPTS,
        description: `Rapid repeated attempts detected: ${recentAttempts.length + 1} transactions from payer ${transaction.payerReference} within 1 minute`,
        severity: 'high',
        detectedAt: new Date(),
        metadata: {
          payerReference: transaction.payerReference,
          attemptCount: recentAttempts.length + 1,
          attempts: recentAttempts.map((tx) => ({
            id: tx.id,
            amount: tx.amount,
            timestamp: tx.transactionDate,
          })),
        },
      };
    }

    return null;
  }

  /**
   * Detect unknown reference.
   * Flags transactions with missing or suspicious reference information.
   * Unknown reference may indicate invalid or spoofed transactions.
   *
   * @param transaction - The transaction to check
   * @returns FraudSignal if unknown reference detected, null otherwise
   */
  private detectUnknownReference(
    transaction: TransactionForFraudAnalysis,
  ): FraudSignal | null {
    // Check if provider reference is missing or empty
    if (
      !transaction.providerReference ||
      transaction.providerReference.trim().length === 0
    ) {
      return {
        signalType: FraudSignalType.UNKNOWN_REFERENCE,
        description: `Unknown provider reference: missing or empty reference`,
        severity: 'high',
        detectedAt: new Date(),
        metadata: {
          provider: transaction.provider,
          reference: transaction.providerReference,
        },
      };
    }

    // Check if payer reference is missing (for transactions that should have one)
    if (
      !transaction.payerReference ||
      transaction.payerReference.trim().length === 0
    ) {
      return {
        signalType: FraudSignalType.UNKNOWN_REFERENCE,
        description: `Unknown payer reference: missing or empty payer reference`,
        severity: 'medium',
        detectedAt: new Date(),
        metadata: {
          provider: transaction.provider,
          providerReference: transaction.providerReference,
        },
      };
    }

    return null;
  }
}
