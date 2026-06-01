import { Injectable } from '@nestjs/common';

/**
 * Reconciliation status enum representing transaction classification states.
 * - MATCHED: Transaction successfully matched with a counterpart
 * - PENDING: Transaction waiting for reconciliation (no counterpart found yet)
 * - MISMATCHED: Transaction found counterpart but details don't align
 * - DUPLICATE: Multiple identical or nearly identical transactions detected
 */
export enum ReconciliationStatus {
  MATCHED = 'MATCHED',
  PENDING = 'PENDING',
  MISMATCHED = 'MISMATCHED',
  DUPLICATE = 'DUPLICATE',
}

/**
 * Represents a normalized transaction for reconciliation.
 */
export interface ReconciliationTransaction {
  id: string;
  provider: string;
  providerReference: string;
  amount: number;
  currency: string;
  payerReference: string;
  status: string;
  eventTime: Date;
}

/**
 * Result of matching two transactions.
 */
export interface MatchResult {
  status: ReconciliationStatus;
  primaryTransaction: ReconciliationTransaction;
  counterpartTransactions?: ReconciliationTransaction[];
  mismatchReasons?: string[];
  matchScore?: number;
}

/**
 * Result of analyzing a transaction for duplicates.
 */
export interface DuplicateAnalysisResult {
  status: ReconciliationStatus;
  transaction: ReconciliationTransaction;
  duplicateTransactions?: ReconciliationTransaction[];
  duplicateCount: number;
}

/**
 * Result of analyzing a transaction for mismatches.
 */
export interface MismatchAnalysisResult {
  status: ReconciliationStatus;
  transaction: ReconciliationTransaction;
  mismatchedCounterparts?: ReconciliationTransaction[];
  mismatchReasons: string[];
}

/**
 * Result of analyzing pending records.
 */
export interface PendingAnalysisResult {
  status: ReconciliationStatus;
  transaction: ReconciliationTransaction;
  daysPending: number;
  lastActivity?: Date;
}

/**
 * ReconciliationService provides transaction classification and reconciliation analysis.
 *
 * Responsibilities:
 * - Classify transactions into reconciliation statuses
 * - Match transactions between different sources
 * - Detect duplicate transactions
 * - Identify mismatches between transaction pairs
 * - Analyze pending transactions
 *
 * Does NOT:
 * - Automatically resolve discrepancies
 * - Perform analytics or reporting
 * - Persist data
 * - Make state changes
 *
 * This is a stateless, classification-only service.
 */
@Injectable()
export class ReconciliationService {
  /**
   * Match a primary transaction against a set of potential counterparts.
   * Returns classification and details of the matching result.
   *
   * @param primaryTransaction - The transaction to match
   * @param counterparts - Potential matching transactions
   * @returns MatchResult with status and details
   */
  matchTransaction(
    primaryTransaction: ReconciliationTransaction,
    counterparts: ReconciliationTransaction[],
  ): MatchResult {
    if (counterparts.length === 0) {
      return {
        status: ReconciliationStatus.PENDING,
        primaryTransaction,
        counterpartTransactions: [],
      };
    }

    const matches = counterparts.filter((counterpart) =>
      this.isExactMatch(primaryTransaction, counterpart),
    );

    if (matches.length === 1) {
      return {
        status: ReconciliationStatus.MATCHED,
        primaryTransaction,
        counterpartTransactions: matches,
        matchScore: 100,
      };
    }

    if (matches.length > 1) {
      return {
        status: ReconciliationStatus.DUPLICATE,
        primaryTransaction,
        counterpartTransactions: matches,
      };
    }

    // Check for partial/fuzzy matches
    const fuzzyMatches = counterparts.filter((counterpart) =>
      this.isFuzzyMatch(primaryTransaction, counterpart),
    );

    if (fuzzyMatches.length > 0) {
      const mismatches = this.identifyMismatches(
        primaryTransaction,
        fuzzyMatches[0],
      );
      return {
        status: ReconciliationStatus.MISMATCHED,
        primaryTransaction,
        counterpartTransactions: fuzzyMatches,
        mismatchReasons: mismatches,
      };
    }

    return {
      status: ReconciliationStatus.PENDING,
      primaryTransaction,
      counterpartTransactions: [],
    };
  }

  /**
   * Detect duplicate transactions in a collection.
   * Identifies exact duplicates and near-duplicates.
   *
   * @param transaction - Transaction to analyze
   * @param allTransactions - Set of all transactions to check against
   * @returns DuplicateAnalysisResult with duplicate count and classification
   */
  detectDuplicates(
    transaction: ReconciliationTransaction,
    allTransactions: ReconciliationTransaction[],
  ): DuplicateAnalysisResult {
    // Exclude the transaction itself
    const others = allTransactions.filter((t) => t.id !== transaction.id);

    // Find exact duplicates
    const exactDuplicates = others.filter((other) =>
      this.isExactMatch(transaction, other),
    );

    if (exactDuplicates.length > 0) {
      return {
        status: ReconciliationStatus.DUPLICATE,
        transaction,
        duplicateTransactions: exactDuplicates,
        duplicateCount: exactDuplicates.length + 1, // +1 for the original
      };
    }

    // Find near-duplicates
    const nearDuplicates = others.filter((other) =>
      this.isNearDuplicate(transaction, other),
    );

    if (nearDuplicates.length > 0) {
      return {
        status: ReconciliationStatus.DUPLICATE,
        transaction,
        duplicateTransactions: nearDuplicates,
        duplicateCount: nearDuplicates.length + 1, // +1 for the original
      };
    }

    return {
      status: ReconciliationStatus.MATCHED,
      transaction,
      duplicateTransactions: [],
      duplicateCount: 1,
    };
  }

  /**
   * Detect mismatches between two transactions.
   * Identifies specific fields that don't align.
   *
   * @param transaction1 - First transaction
   * @param transaction2 - Second transaction
   * @returns MismatchAnalysisResult with identified mismatches
   */
  detectMismatches(
    transaction1: ReconciliationTransaction,
    transaction2: ReconciliationTransaction,
  ): MismatchAnalysisResult {
    const mismatchReasons = this.identifyMismatches(transaction1, transaction2);

    if (mismatchReasons.length === 0) {
      return {
        status: ReconciliationStatus.MATCHED,
        transaction: transaction1,
        mismatchedCounterparts: [],
        mismatchReasons: [],
      };
    }

    return {
      status: ReconciliationStatus.MISMATCHED,
      transaction: transaction1,
      mismatchedCounterparts: [transaction2],
      mismatchReasons,
    };
  }

  /**
   * Analyze a transaction for pending status.
   * Classifies transactions waiting for reconciliation.
   *
   * @param transaction - Transaction to analyze
   * @param referenceDate - Date to calculate pending duration from (defaults to now)
   * @returns PendingAnalysisResult with pending duration
   */
  analyzePendingRecord(
    transaction: ReconciliationTransaction,
    referenceDate: Date = new Date(),
  ): PendingAnalysisResult {
    const daysPending = Math.floor(
      (referenceDate.getTime() - transaction.eventTime.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return {
      status: ReconciliationStatus.PENDING,
      transaction,
      daysPending,
      lastActivity: transaction.eventTime,
    };
  }

  /**
   * Classify a transaction based on analysis.
   * Performs complete classification against a reference set.
   *
   * @param transaction - Transaction to classify
   * @param allTransactions - All transactions for comparison
   * @returns ReconciliationStatus classification
   */
  classifyTransaction(
    transaction: ReconciliationTransaction,
    allTransactions: ReconciliationTransaction[],
  ): ReconciliationStatus {
    // Check for duplicates first
    const duplicateAnalysis = this.detectDuplicates(transaction, allTransactions);
    if (duplicateAnalysis.duplicateCount > 1) {
      return ReconciliationStatus.DUPLICATE;
    }

    // Try to match against other transactions
    const otherTransactions = allTransactions.filter(
      (t) => t.id !== transaction.id,
    );
    const matchResult = this.matchTransaction(transaction, otherTransactions);

    return matchResult.status;
  }

  /**
   * Check if two transactions are an exact match.
   * All key fields must match exactly.
   *
   * @private
   */
  private isExactMatch(
    t1: ReconciliationTransaction,
    t2: ReconciliationTransaction,
  ): boolean {
    return (
      t1.provider === t2.provider &&
      t1.amount === t2.amount &&
      t1.currency === t2.currency &&
      t1.payerReference === t2.payerReference &&
      t1.providerReference === t2.providerReference &&
      t1.status === t2.status
    );
  }

  /**
   * Check if two transactions are a fuzzy match.
   * Core fields match but some details may differ.
   *
   * @private
   */
  private isFuzzyMatch(
    t1: ReconciliationTransaction,
    t2: ReconciliationTransaction,
  ): boolean {
    return (
      t1.provider === t2.provider &&
      t1.amount === t2.amount &&
      t1.currency === t2.currency &&
      t1.payerReference === t2.payerReference
    );
  }

  /**
   * Check if two transactions are near-duplicates.
   * Same provider, payer, and similar amount, but potentially different references.
   *
   * @private
   */
  private isNearDuplicate(
    t1: ReconciliationTransaction,
    t2: ReconciliationTransaction,
  ): boolean {
    const amountDifference = Math.abs(t1.amount - t2.amount);
    const timeDifferenceMs = Math.abs(
      t1.eventTime.getTime() - t2.eventTime.getTime(),
    );
    const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);

    // Consider near-duplicate if:
    // - Same provider and payer
    // - Amount is identical
    // - Events occurred within 24 hours
    return (
      t1.provider === t2.provider &&
      t1.payerReference === t2.payerReference &&
      amountDifference === 0 &&
      timeDifferenceHours <= 24
    );
  }

  /**
   * Identify specific mismatch reasons between two transactions.
   *
   * @private
   */
  private identifyMismatches(
    t1: ReconciliationTransaction,
    t2: ReconciliationTransaction,
  ): string[] {
    const mismatches: string[] = [];

    if (t1.provider !== t2.provider) {
      mismatches.push(
        `Provider mismatch: ${t1.provider} vs ${t2.provider}`,
      );
    }

    if (t1.amount !== t2.amount) {
      mismatches.push(
        `Amount mismatch: ${t1.amount} vs ${t2.amount}`,
      );
    }

    if (t1.currency !== t2.currency) {
      mismatches.push(
        `Currency mismatch: ${t1.currency} vs ${t2.currency}`,
      );
    }

    if (t1.payerReference !== t2.payerReference) {
      mismatches.push(
        `Payer reference mismatch: ${t1.payerReference} vs ${t2.payerReference}`,
      );
    }

    if (t1.providerReference !== t2.providerReference) {
      mismatches.push(
        `Provider reference mismatch: ${t1.providerReference} vs ${t2.providerReference}`,
      );
    }

    if (t1.status !== t2.status) {
      mismatches.push(
        `Status mismatch: ${t1.status} vs ${t2.status}`,
      );
    }

    return mismatches;
  }
}
