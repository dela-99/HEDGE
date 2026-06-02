"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = exports.ReconciliationStatus = void 0;
const common_1 = require("@nestjs/common");
var ReconciliationStatus;
(function (ReconciliationStatus) {
    ReconciliationStatus["MATCHED"] = "MATCHED";
    ReconciliationStatus["PENDING"] = "PENDING";
    ReconciliationStatus["MISMATCHED"] = "MISMATCHED";
    ReconciliationStatus["DUPLICATE"] = "DUPLICATE";
})(ReconciliationStatus || (exports.ReconciliationStatus = ReconciliationStatus = {}));
let ReconciliationService = class ReconciliationService {
    matchTransaction(primaryTransaction, counterparts) {
        if (counterparts.length === 0) {
            return {
                status: ReconciliationStatus.PENDING,
                primaryTransaction,
                counterpartTransactions: [],
            };
        }
        const matches = counterparts.filter((counterpart) => this.isExactMatch(primaryTransaction, counterpart));
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
        const fuzzyMatches = counterparts.filter((counterpart) => this.isFuzzyMatch(primaryTransaction, counterpart));
        if (fuzzyMatches.length > 0) {
            const mismatches = this.identifyMismatches(primaryTransaction, fuzzyMatches[0]);
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
    detectDuplicates(transaction, allTransactions) {
        const others = allTransactions.filter((t) => t.id !== transaction.id);
        const exactDuplicates = others.filter((other) => this.isExactMatch(transaction, other));
        if (exactDuplicates.length > 0) {
            return {
                status: ReconciliationStatus.DUPLICATE,
                transaction,
                duplicateTransactions: exactDuplicates,
                duplicateCount: exactDuplicates.length + 1,
            };
        }
        const nearDuplicates = others.filter((other) => this.isNearDuplicate(transaction, other));
        if (nearDuplicates.length > 0) {
            return {
                status: ReconciliationStatus.DUPLICATE,
                transaction,
                duplicateTransactions: nearDuplicates,
                duplicateCount: nearDuplicates.length + 1,
            };
        }
        return {
            status: ReconciliationStatus.MATCHED,
            transaction,
            duplicateTransactions: [],
            duplicateCount: 1,
        };
    }
    detectMismatches(transaction1, transaction2) {
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
    analyzePendingRecord(transaction, referenceDate = new Date()) {
        const daysPending = Math.floor((referenceDate.getTime() - transaction.eventTime.getTime()) /
            (1000 * 60 * 60 * 24));
        return {
            status: ReconciliationStatus.PENDING,
            transaction,
            daysPending,
            lastActivity: transaction.eventTime,
        };
    }
    classifyTransaction(transaction, allTransactions) {
        const duplicateAnalysis = this.detectDuplicates(transaction, allTransactions);
        if (duplicateAnalysis.duplicateCount > 1) {
            return ReconciliationStatus.DUPLICATE;
        }
        const otherTransactions = allTransactions.filter((t) => t.id !== transaction.id);
        const matchResult = this.matchTransaction(transaction, otherTransactions);
        return matchResult.status;
    }
    isExactMatch(t1, t2) {
        return (t1.provider === t2.provider &&
            t1.amount === t2.amount &&
            t1.currency === t2.currency &&
            t1.payerReference === t2.payerReference &&
            t1.providerReference === t2.providerReference &&
            t1.status === t2.status);
    }
    isFuzzyMatch(t1, t2) {
        return (t1.provider === t2.provider &&
            t1.amount === t2.amount &&
            t1.currency === t2.currency &&
            t1.payerReference === t2.payerReference);
    }
    isNearDuplicate(t1, t2) {
        const amountDifference = Math.abs(t1.amount - t2.amount);
        const timeDifferenceMs = Math.abs(t1.eventTime.getTime() - t2.eventTime.getTime());
        const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);
        return (t1.provider === t2.provider &&
            t1.payerReference === t2.payerReference &&
            amountDifference === 0 &&
            timeDifferenceHours <= 24);
    }
    identifyMismatches(t1, t2) {
        const mismatches = [];
        if (t1.provider !== t2.provider) {
            mismatches.push(`Provider mismatch: ${t1.provider} vs ${t2.provider}`);
        }
        if (t1.amount !== t2.amount) {
            mismatches.push(`Amount mismatch: ${t1.amount} vs ${t2.amount}`);
        }
        if (t1.currency !== t2.currency) {
            mismatches.push(`Currency mismatch: ${t1.currency} vs ${t2.currency}`);
        }
        if (t1.payerReference !== t2.payerReference) {
            mismatches.push(`Payer reference mismatch: ${t1.payerReference} vs ${t2.payerReference}`);
        }
        if (t1.providerReference !== t2.providerReference) {
            mismatches.push(`Provider reference mismatch: ${t1.providerReference} vs ${t2.providerReference}`);
        }
        if (t1.status !== t2.status) {
            mismatches.push(`Status mismatch: ${t1.status} vs ${t2.status}`);
        }
        return mismatches;
    }
};
exports.ReconciliationService = ReconciliationService;
exports.ReconciliationService = ReconciliationService = __decorate([
    (0, common_1.Injectable)()
], ReconciliationService);
//# sourceMappingURL=reconciliation.service.js.map