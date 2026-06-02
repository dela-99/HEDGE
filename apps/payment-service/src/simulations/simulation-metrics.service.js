"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SimulationMetricsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationMetricsService = void 0;
const common_1 = require("@nestjs/common");
let SimulationMetricsService = SimulationMetricsService_1 = class SimulationMetricsService {
    logger = new common_1.Logger(SimulationMetricsService_1.name);
    collectMetrics(summary) {
        const pipelineResults = summary.pipelineResults || [];
        let totalEvents = 0;
        let successfulEvents = 0;
        let failedEvents = 0;
        let duplicateDetections = 0;
        let fraudDetections = 0;
        let reconciliationMatches = 0;
        let reconciliationMismatches = 0;
        let reconciliationPending = 0;
        let fraudSignalCount = 0;
        let errorCount = 0;
        let totalProcessingTime = 0;
        for (const result of pipelineResults) {
            totalEvents++;
            if (result.status === 'success') {
                successfulEvents++;
            }
            else {
                failedEvents++;
            }
            if (result.originalStatus === 'DUPLICATE') {
                duplicateDetections++;
            }
            if (result.fraudSignals && result.fraudSignals.length > 0) {
                fraudDetections++;
                fraudSignalCount += result.fraudSignals.length;
            }
            if (result.reconciliationStatus) {
                if (result.reconciliationStatus === 'MATCHED') {
                    reconciliationMatches++;
                }
                else if (result.reconciliationStatus === 'MISMATCHED') {
                    reconciliationMismatches++;
                }
                else if (result.reconciliationStatus === 'PENDING') {
                    reconciliationPending++;
                }
            }
            if (result.errors && result.errors.length > 0) {
                errorCount += result.errors.length;
            }
        }
        const averageProcessingTime = totalEvents > 0 ? summary.duration / totalEvents : 0;
        const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0;
        const fraudRate = totalEvents > 0 ? (fraudDetections / totalEvents) * 100 : 0;
        const matchRate = (reconciliationMatches + reconciliationMismatches) > 0
            ? (reconciliationMatches / (reconciliationMatches + reconciliationMismatches)) * 100
            : 0;
        const report = {
            totalEvents,
            successfulEvents,
            failedEvents,
            duplicateDetections,
            fraudDetections,
            reconciliationMatches,
            reconciliationMismatches,
            averageProcessingTime,
            errorCount,
            totalProcessingTime: summary.duration,
            fraudSignalCount,
            reconciliationPending,
            executedAt: summary.executedAt,
            successRate,
            fraudRate,
            matchRate,
        };
        this.logger.log(`Metrics collected: Total=${totalEvents}, Successful=${successfulEvents}, Failed=${failedEvents}`);
        return report;
    }
    exportToJSON(report) {
        return JSON.stringify(report, null, 2);
    }
    exportToObject(report) {
        return {
            totalEvents: report.totalEvents,
            successfulEvents: report.successfulEvents,
            failedEvents: report.failedEvents,
            duplicateDetections: report.duplicateDetections,
            fraudDetections: report.fraudDetections,
            reconciliationMatches: report.reconciliationMatches,
            reconciliationMismatches: report.reconciliationMismatches,
            averageProcessingTime: report.averageProcessingTime,
            errorCount: report.errorCount,
            totalProcessingTime: report.totalProcessingTime,
            fraudSignalCount: report.fraudSignalCount,
            reconciliationPending: report.reconciliationPending,
            successRate: report.successRate,
            fraudRate: report.fraudRate,
            matchRate: report.matchRate,
            executedAt: report.executedAt.toISOString(),
        };
    }
    generateSummary(report) {
        return `
=== Simulation Metrics Report ===
Total Events: ${report.totalEvents}
Successful Events: ${report.successfulEvents}
Failed Events: ${report.failedEvents}
Success Rate: ${report.successRate.toFixed(2)}%

Duplicate Detections: ${report.duplicateDetections}
Fraud Detections: ${report.fraudDetections} (${report.fraudRate.toFixed(2)}%)
Fraud Signals: ${report.fraudSignalCount}

Reconciliation Matches: ${report.reconciliationMatches}
Reconciliation Mismatches: ${report.reconciliationMismatches}
Reconciliation Pending: ${report.reconciliationPending}
Match Rate: ${report.matchRate.toFixed(2)}%

Average Processing Time: ${report.averageProcessingTime.toFixed(2)}ms
Total Processing Time: ${report.totalProcessingTime}ms
Total Errors: ${report.errorCount}

Executed At: ${report.executedAt.toISOString()}
===================================
    `.trim();
    }
};
exports.SimulationMetricsService = SimulationMetricsService;
exports.SimulationMetricsService = SimulationMetricsService = SimulationMetricsService_1 = __decorate([
    (0, common_1.Injectable)()
], SimulationMetricsService);
//# sourceMappingURL=simulation-metrics.service.js.map