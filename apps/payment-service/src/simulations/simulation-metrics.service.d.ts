import { SimulationSummary } from './simulation-runner.service';
export interface SimulationReport {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    duplicateDetections: number;
    fraudDetections: number;
    reconciliationMatches: number;
    reconciliationMismatches: number;
    averageProcessingTime: number;
    errorCount: number;
    totalProcessingTime: number;
    fraudSignalCount: number;
    reconciliationPending: number;
    executedAt: Date;
    successRate: number;
    fraudRate: number;
    matchRate: number;
}
export declare class SimulationMetricsService {
    private readonly logger;
    collectMetrics(summary: SimulationSummary): SimulationReport;
    exportToJSON(report: SimulationReport): string;
    exportToObject(report: SimulationReport): Record<string, any>;
    generateSummary(report: SimulationReport): string;
}
