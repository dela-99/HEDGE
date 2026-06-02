import { Injectable, Logger } from '@nestjs/common';
import { PipelineEventResult, SimulationSummary } from './simulation-runner.service';

/**
 * Report of simulation metrics.
 * Contains comprehensive metrics collected from a simulation run.
 */
export interface SimulationReport {
  // Basic counts
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;

  // Specific detection counts
  duplicateDetections: number;
  fraudDetections: number;

  // Reconciliation metrics
  reconciliationMatches: number;
  reconciliationMismatches: number;

  // Performance metrics
  averageProcessingTime: number; // milliseconds
  errorCount: number;

  // Additional metrics
  totalProcessingTime: number; // milliseconds
  fraudSignalCount: number;
  reconciliationPending: number;

  // Timestamps
  executedAt: Date;

  // Additional context
  successRate: number; // percentage
  fraudRate: number; // percentage
  matchRate: number; // percentage
}

/**
 * SimulationMetricsService collects and aggregates metrics from simulation runs.
 *
 * Responsibilities:
 * - Collect metrics from PipelineEventResult arrays
 * - Generate SimulationReport with comprehensive statistics
 * - Export reports to JSON format
 * - Calculate derived metrics (averages, rates, etc.)
 */
@Injectable()
export class SimulationMetricsService {
  private readonly logger = new Logger(SimulationMetricsService.name);

  /**
   * Collect metrics from a SimulationSummary and generate a report.
   *
   * @param summary - The simulation summary with pipeline results
   * @returns SimulationReport with collected metrics
   */
  collectMetrics(summary: SimulationSummary): SimulationReport {
    const pipelineResults = summary.pipelineResults || [];

    // Initialize counters
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

    // Collect metrics from each result
    for (const result of pipelineResults) {
      totalEvents++;

      // Count successful/failed
      if (result.status === 'success') {
        successfulEvents++;
      } else {
        failedEvents++;
      }

      // Count duplicates
      if (result.originalStatus === 'DUPLICATE') {
        duplicateDetections++;
      }

      // Count fraud detections
      if (result.fraudSignals && result.fraudSignals.length > 0) {
        fraudDetections++;
        fraudSignalCount += result.fraudSignals.length;
      }

      // Count reconciliation status
      if (result.reconciliationStatus) {
        if (result.reconciliationStatus === 'MATCHED') {
          reconciliationMatches++;
        } else if (result.reconciliationStatus === 'MISMATCHED') {
          reconciliationMismatches++;
        } else if (result.reconciliationStatus === 'PENDING') {
          reconciliationPending++;
        }
      }

      // Count errors
      if (result.errors && result.errors.length > 0) {
        errorCount += result.errors.length;
      }
    }

    // Calculate average processing time
    const averageProcessingTime = totalEvents > 0 ? summary.duration / totalEvents : 0;

    // Calculate percentages
    const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0;
    const fraudRate = totalEvents > 0 ? (fraudDetections / totalEvents) * 100 : 0;
    const matchRate = (reconciliationMatches + reconciliationMismatches) > 0
      ? (reconciliationMatches / (reconciliationMatches + reconciliationMismatches)) * 100
      : 0;

    const report: SimulationReport = {
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

    this.logger.log(
      `Metrics collected: Total=${totalEvents}, Successful=${successfulEvents}, Failed=${failedEvents}`,
    );

    return report;
  }

  /**
   * Export a SimulationReport to JSON format.
   *
   * @param report - The simulation report to export
   * @returns JSON string representation of the report
   */
  exportToJSON(report: SimulationReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export a SimulationReport to a JSON object (for file writing).
   *
   * @param report - The simulation report to export
   * @returns Plain object suitable for JSON serialization
   */
  exportToObject(report: SimulationReport): Record<string, any> {
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

  /**
   * Generate a summary string representation of metrics.
   *
   * @param report - The simulation report
   * @returns Human-readable summary
   */
  generateSummary(report: SimulationReport): string {
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
}
