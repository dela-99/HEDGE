"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudService = exports.FraudSignalType = void 0;
const common_1 = require("@nestjs/common");
var FraudSignalType;
(function (FraudSignalType) {
    FraudSignalType["DUPLICATE_TRANSACTION"] = "DUPLICATE_TRANSACTION";
    FraudSignalType["UNUSUAL_AMOUNT"] = "UNUSUAL_AMOUNT";
    FraudSignalType["RAPID_REPEATED_ATTEMPTS"] = "RAPID_REPEATED_ATTEMPTS";
    FraudSignalType["UNKNOWN_REFERENCE"] = "UNKNOWN_REFERENCE";
})(FraudSignalType || (exports.FraudSignalType = FraudSignalType = {}));
let FraudService = class FraudService {
    DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
    RAPID_ATTEMPTS_WINDOW_MS = 60 * 1000;
    RAPID_ATTEMPTS_THRESHOLD = 2;
    MIN_TRANSACTIONS_FOR_AVERAGE = 3;
    UNUSUAL_AMOUNT_MULTIPLIER = 5;
    analyzTransaction(transaction, history) {
        const signals = [];
        const duplicateSignal = this.detectDuplicateTransaction(transaction, history);
        if (duplicateSignal) {
            signals.push(duplicateSignal);
        }
        const unusualAmountSignal = this.detectUnusualAmount(transaction, history);
        if (unusualAmountSignal) {
            signals.push(unusualAmountSignal);
        }
        const rapidAttemptsSignal = this.detectRapidRepeatedAttempts(transaction, history);
        if (rapidAttemptsSignal) {
            signals.push(rapidAttemptsSignal);
        }
        const unknownRefSignal = this.detectUnknownReference(transaction);
        if (unknownRefSignal) {
            signals.push(unknownRefSignal);
        }
        return signals;
    }
    detectDuplicateTransaction(transaction, history) {
        if (!history || history.length === 0) {
            return null;
        }
        const now = transaction.transactionDate;
        for (const historyTx of history) {
            if (historyTx.provider === transaction.provider &&
                historyTx.providerReference === transaction.providerReference) {
                const timeDiffMs = now.getTime() - historyTx.transactionDate.getTime();
                if (timeDiffMs > 0 && timeDiffMs <= this.DUPLICATE_WINDOW_MS) {
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
    detectUnusualAmount(transaction, history) {
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
        if (history && history.length > 0) {
            const recentTransactions = history.filter((tx) => tx.currency === transaction.currency);
            if (recentTransactions.length >= this.MIN_TRANSACTIONS_FOR_AVERAGE) {
                const avgAmount = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0) /
                    recentTransactions.length;
                const threshold = avgAmount * this.UNUSUAL_AMOUNT_MULTIPLIER;
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
    detectRapidRepeatedAttempts(transaction, history) {
        if (!history || history.length === 0 || !transaction.payerReference) {
            return null;
        }
        const now = transaction.transactionDate;
        const recentAttempts = history.filter((historyTx) => {
            if (historyTx.payerReference !== transaction.payerReference) {
                return false;
            }
            const timeDiffMs = now.getTime() - historyTx.transactionDate.getTime();
            return timeDiffMs > 0 && timeDiffMs <= this.RAPID_ATTEMPTS_WINDOW_MS;
        });
        if (recentAttempts.length >= this.RAPID_ATTEMPTS_THRESHOLD) {
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
    detectUnknownReference(transaction) {
        if (!transaction.providerReference ||
            transaction.providerReference.trim().length === 0) {
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
        if (!transaction.payerReference ||
            transaction.payerReference.trim().length === 0) {
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
};
exports.FraudService = FraudService;
exports.FraudService = FraudService = __decorate([
    (0, common_1.Injectable)()
], FraudService);
//# sourceMappingURL=fraud.service.js.map