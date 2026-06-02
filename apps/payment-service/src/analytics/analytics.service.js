"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
let AnalyticsService = class AnalyticsService {
    generateDailyMetrics(transactions, startDate, endDate) {
        const filteredTransactions = transactions.filter((tx) => {
            const txDate = new Date(tx.transactionDate);
            return txDate >= startDate && txDate <= endDate;
        });
        const dailyByDateCurrency = new Map();
        const failuresByDateReason = new Map();
        let totalRevenue = 0;
        let totalFailures = 0;
        let totalTransactionsProcessed = 0;
        for (const tx of filteredTransactions) {
            const dateKey = this.getDateKey(tx.transactionDate);
            const currencyDateKey = `${dateKey}:${tx.currency}`;
            if (tx.status === 'succeeded' || tx.status === 'pending') {
                totalRevenue += tx.amount;
                if (!dailyByDateCurrency.has(currencyDateKey)) {
                    dailyByDateCurrency.set(currencyDateKey, {
                        total: 0,
                        count: 0,
                        currency: tx.currency,
                        date: this.getDateFromKey(dateKey),
                    });
                }
                const dayData = dailyByDateCurrency.get(currencyDateKey);
                dayData.total += tx.amount;
                dayData.count += 1;
            }
            if (tx.status === 'failed') {
                totalFailures += 1;
                const reason = tx.failureReason || 'unknown';
                const failureKey = `${dateKey}:${reason}`;
                if (!failuresByDateReason.has(failureKey)) {
                    failuresByDateReason.set(failureKey, {
                        count: 0,
                        date: this.getDateFromKey(dateKey),
                        reason,
                    });
                }
                const failureData = failuresByDateReason.get(failureKey);
                failureData.count += 1;
            }
            totalTransactionsProcessed += 1;
        }
        const dailyRevenue = Array.from(dailyByDateCurrency.values())
            .map((d) => ({
            date: d.date,
            currency: d.currency,
            totalAmount: d.total,
            transactionCount: d.count,
            averageAmount: d.count > 0 ? d.total / d.count : 0,
        }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        const failedTransactions = Array.from(failuresByDateReason.values())
            .map((f) => ({
            date: f.date,
            failureReason: f.reason,
            count: f.count,
            percentage: totalFailures > 0
                ? (f.count / totalFailures) * 100
                : 0,
        }))
            .sort((a, b) => a.date.getTime() - b.date.getTime() || b.count - a.count);
        return {
            generatedAt: new Date(),
            dateRange: {
                startDate,
                endDate,
            },
            dailyRevenue,
            failedTransactions,
            totalRevenue,
            totalTransactions: filteredTransactions.length,
            totalFailures,
        };
    }
    generateReconciliationMetrics(reconciliationResults, startDate, endDate) {
        const filteredResults = reconciliationResults.filter((result) => {
            const resultDate = new Date(result.eventTime);
            return resultDate >= startDate && resultDate <= endDate;
        });
        const dailyStatuses = new Map();
        let totalMatched = 0;
        let totalPending = 0;
        let totalMismatched = 0;
        let totalDuplicate = 0;
        for (const result of filteredResults) {
            const dateKey = this.getDateKey(result.eventTime);
            if (!dailyStatuses.has(dateKey)) {
                dailyStatuses.set(dateKey, {
                    matched: 0,
                    pending: 0,
                    mismatched: 0,
                    duplicate: 0,
                    total: 0,
                    date: this.getDateFromKey(dateKey),
                });
            }
            const dayData = dailyStatuses.get(dateKey);
            dayData.total += 1;
            switch (result.status) {
                case 'MATCHED':
                    dayData.matched += 1;
                    totalMatched += 1;
                    break;
                case 'PENDING':
                    dayData.pending += 1;
                    totalPending += 1;
                    break;
                case 'MISMATCHED':
                    dayData.mismatched += 1;
                    totalMismatched += 1;
                    break;
                case 'DUPLICATE':
                    dayData.duplicate += 1;
                    totalDuplicate += 1;
                    break;
            }
        }
        const reconciliationRate = Array.from(dailyStatuses.values())
            .map((d) => ({
            date: d.date,
            matchedCount: d.matched,
            pendingCount: d.pending,
            mismatchedCount: d.mismatched,
            duplicateCount: d.duplicate,
            totalCount: d.total,
            matchRate: d.total > 0 ? (d.matched / d.total) * 100 : 0,
            pendingRate: d.total > 0 ? (d.pending / d.total) * 100 : 0,
            mismatchRate: d.total > 0 ? (d.mismatched / d.total) * 100 : 0,
            duplicateRate: d.total > 0 ? (d.duplicate / d.total) * 100 : 0,
        }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        const totalCount = filteredResults.length;
        const overallMatchRate = totalCount > 0 ? (totalMatched / totalCount) * 100 : 0;
        const overallPendingRate = totalCount > 0 ? (totalPending / totalCount) * 100 : 0;
        const overallMismatchRate = totalCount > 0 ? (totalMismatched / totalCount) * 100 : 0;
        const overallDuplicateRate = totalCount > 0 ? (totalDuplicate / totalCount) * 100 : 0;
        return {
            generatedAt: new Date(),
            dateRange: {
                startDate,
                endDate,
            },
            reconciliationRate,
            overallMatchRate,
            overallPendingRate,
            overallMismatchRate,
            overallDuplicateRate,
            totalReconciliationRecords: totalCount,
        };
    }
    generateFraudSignalMetrics(fraudSignals, startDate, endDate) {
        const filteredSignals = fraudSignals.filter((signal) => {
            const signalDate = new Date(signal.detectedAt);
            return signalDate >= startDate && signalDate <= endDate;
        });
        const signalsByDateTypeSeverity = new Map();
        const severityScoreMap = { low: 1, medium: 2, high: 3 };
        for (const signal of filteredSignals) {
            const dateKey = this.getDateKey(signal.detectedAt);
            const typeKey = `${dateKey}:${signal.signalType}:${signal.severity}`;
            if (!signalsByDateTypeSeverity.has(typeKey)) {
                signalsByDateTypeSeverity.set(typeKey, {
                    count: 0,
                    severityScores: [],
                    date: this.getDateFromKey(dateKey),
                    signalType: signal.signalType,
                    severity: signal.severity,
                });
            }
            const entry = signalsByDateTypeSeverity.get(typeKey);
            entry.count += 1;
            entry.severityScores.push(severityScoreMap[signal.severity]);
        }
        return Array.from(signalsByDateTypeSeverity.values())
            .map((entry) => ({
            date: entry.date,
            signalType: entry.signalType,
            count: entry.count,
            severity: entry.severity,
            averageSeverityScore: entry.severityScores.length > 0
                ? entry.severityScores.reduce((a, b) => a + b, 0) / entry.severityScores.length
                : 0,
        }))
            .sort((a, b) => a.date.getTime() - b.date.getTime() ||
            a.signalType.localeCompare(b.signalType) ||
            b.count - a.count);
    }
    getDateKey(date) {
        const d = new Date(date);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    getDateFromKey(key) {
        return new Date(`${key}T00:00:00Z`);
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)()
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map