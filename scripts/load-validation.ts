import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../apps/payment-service/src/app.module';
import { LoadValidationService } from '../apps/payment-service/src/simulations/load-validation.service';

/**
 * Load Validation Command
 *
 * Runs comprehensive load validation with 1000, 5000, and 10000 events.
 * Validates gate criteria and generates detailed report.
 *
 * Usage:
 *   npm run load-validation
 *   node dist/scripts/load-validation.js
 */
async function runLoadValidation(): Promise<void> {
  const startTime = Date.now();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║          Load Validation - Comprehensive Test          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let app;
  try {
    // Initialize NestJS application context
    console.log('📋 Initializing application context...');
    app = await NestFactory.create(AppModule, {
      logger: ['error'],
    });

    // Get the LoadValidationService from DI container
    const loadValidationService = app.get(LoadValidationService);

    console.log('✅ Application context initialized\n');

    // Run comprehensive load validation
    console.log('🔄 Starting load validation tests...\n');
    const report = await loadValidationService.runLoadValidation();
    console.log('✅ Load validation completed\n');

    // Display gate criteria validation
    console.log('═══════════════════════════════════════════════════════');
    console.log('                  GO/NO-GO GATE VALIDATION');
    console.log('═══════════════════════════════════════════════════════\n');

    let allPass = true;
    for (const criterion of report.gateCriteria) {
      const statusSymbol =
        criterion.status === 'PASS'
          ? '✅'
          : criterion.status === 'FAIL'
            ? '❌'
            : '⚠️ ';
      console.log(`${statusSymbol} ${criterion.criterion}`);
      console.log(`   ${criterion.message}`);
      if (criterion.value) {
        console.log(`   Value: ${criterion.value}`);
      }
      if (criterion.threshold) {
        console.log(`   Threshold: ${criterion.threshold}`);
      }
      console.log();

      if (criterion.status === 'FAIL') {
        allPass = false;
      }
    }

    // Overall status
    const statusDisplay = report.overallStatus === 'GO' ? '✅ GO' : '❌ NO-GO';
    console.log(`\n🚀 Overall Status: ${statusDisplay}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Display load test metrics summary
    console.log('📊 Load Test Metrics Summary:');
    console.log('───────────────────────────────────────────────────────\n');

    const tests = [
      { label: '1000 Events', metrics: report.loadTestMetrics.test1000 },
      { label: '5000 Events', metrics: report.loadTestMetrics.test5000 },
      { label: '10000 Events', metrics: report.loadTestMetrics.test10000 },
    ];

    for (const test of tests) {
      console.log(`📈 ${test.label}:`);
      console.log(`   Success Rate:         ${test.metrics.successRate.toFixed(2)}%`);
      console.log(`   Fraud Detections:     ${test.metrics.fraudDetections}`);
      console.log(`   Fraud Signals:        ${test.metrics.fraudSignalCount}`);
      console.log(`   Reconciliation Acc:   ${test.metrics.reconciliationAccuracy.toFixed(2)}%`);
      console.log(`   Avg Processing Time:  ${test.metrics.averageProcessingTime.toFixed(2)}ms`);
      console.log(`   Throughput:           ${test.metrics.eventsPerSecond.toFixed(2)} events/sec`);
      console.log(
        `   Memory Used:          ${(test.metrics.memoryUsed / 1024 / 1024).toFixed(2)} MB`,
      );
      console.log();
    }

    // Display summary statistics
    console.log('📊 Overall Statistics:');
    console.log('───────────────────────────────────────────────────────\n');
    console.log(`Total Events Processed:       ${report.summary.totalEventsProcessed}`);
    console.log(`Total Successful:             ${report.summary.totalSuccessful}`);
    console.log(`Total Failed:                 ${report.summary.totalFailed}`);
    console.log(
      `Avg Reconciliation Accuracy:  ${report.summary.averageReconciliationAccuracy.toFixed(2)}%`,
    );
    console.log(`Avg Error Rate:               ${report.summary.averageErrorRate.toFixed(4)}%`);
    console.log(
      `Avg Processing Time/Event:    ${report.summary.averageProcessingTimePerEvent.toFixed(2)}ms`,
    );
    console.log(
      `Throughput (avg):             ${report.summary.throughputEventsPerSecond.toFixed(2)} events/sec`,
    );
    console.log();

    // Export report to JSON file
    const reportPath = path.join(process.cwd(), 'load-validation-report.json');
    const reportObject = {
      timestamp: report.timestamp.toISOString(),
      overallStatus: report.overallStatus,
      gateCriteria: report.gateCriteria.map(c => ({
        ...c,
        value: c.value?.toString(),
        threshold: c.threshold?.toString(),
      })),
      loadTestMetrics: {
        test1000: report.loadTestMetrics.test1000,
        test5000: report.loadTestMetrics.test5000,
        test10000: report.loadTestMetrics.test10000,
      },
      summary: report.summary,
    };

    fs.writeFileSync(reportPath, JSON.stringify(reportObject, null, 2));
    console.log(`💾 Report saved to: ${reportPath}\n`);

    // Display final status
    const elapsedTime = Date.now() - startTime;
    console.log('╔════════════════════════════════════════════════════════╗');
    if (report.overallStatus === 'GO') {
      console.log('║          ✅ Load Validation PASSED - GO GATE ✅        ║');
    } else {
      console.log('║       ❌ Load Validation FAILED - NO-GO GATE ❌        ║');
    }
    console.log(`║  Total execution time: ${elapsedTime}ms${' '.repeat(Math.max(0, 30 - elapsedTime.toString().length))}║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Exit with appropriate code
    process.exit(report.overallStatus === 'GO' ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Load validation failed with error:');
    console.error(
      error instanceof Error ? error.message : 'Unknown error occurred',
    );
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Clean up
    if (app) {
      await app.close();
    }
  }
}

// Execute the load validation
runLoadValidation().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
