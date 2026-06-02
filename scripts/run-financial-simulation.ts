import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../apps/payment-service/src/app.module';
import { SimulationRunnerService } from '../apps/payment-service/src/simulations/simulation-runner.service';
import { SimulationMetricsService } from '../apps/payment-service/src/simulations/simulation-metrics.service';
import { TransactionGeneratorService } from '../apps/payment-service/src/simulations/generators/transaction-generator.service';

/**
 * Financial Simulation Command
 *
 * Generates 1000 realistic transactions and runs them through the complete
 * payment processing pipeline to generate a comprehensive simulation report.
 *
 * Usage:
 *   npm run simulate
 *   node dist/apps/payment-service/scripts/run-financial-simulation.js
 */
async function runSimulation(): Promise<void> {
  const startTime = Date.now();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     Financial Event Simulation - Command Started       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let app;
  try {
    // Initialize NestJS application context
    console.log('📋 Initializing application context...');
    app = await NestFactory.create(AppModule, {
      logger: ['error'],
    });

    // Get required services from DI container
    const generatorService = app.get(TransactionGeneratorService);
    const runnerService = app.get(SimulationRunnerService);
    const metricsService = app.get(SimulationMetricsService);

    console.log('✅ Application context initialized\n');

    // Generate 1000 transactions
    console.log('🔄 Generating 1000 transactions...');
    const transactions = generatorService.generateTransactions(1000);
    console.log(`✅ Generated ${transactions.length} transactions\n`);

    // Run simulation through replay engine
    console.log('⚙️  Running simulation through replay engine...');
    const summary = await runnerService.replayEvents(transactions);
    console.log(`✅ Simulation completed in ${summary.duration}ms\n`);

    // Collect metrics
    console.log('📊 Collecting metrics...');
    const report = metricsService.collectMetrics(summary);
    console.log('✅ Metrics collected\n');

    // Calculate additional metrics
    const failureRate =
      report.totalEvents > 0
        ? ((report.failedEvents / report.totalEvents) * 100).toFixed(2)
        : '0.00';
    const reconciliationAccuracy = report.matchRate.toFixed(2);

    // Display simulation report
    console.log('═══════════════════════════════════════════════════════');
    console.log('                 SIMULATION REPORT');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📈 Event Processing:');
    console.log(`  • Total Events:                ${report.totalEvents}`);
    console.log(`  • Successful Events:           ${report.successfulEvents}`);
    console.log(`  • Failed Events:               ${report.failedEvents}`);
    console.log(`  • Success Rate:                ${report.successRate.toFixed(2)}%`);
    console.log(`  • Failure Rate:                ${failureRate}%\n`);

    console.log('🚨 Fraud & Anomalies:');
    console.log(`  • Fraud Detections:            ${report.fraudDetections}`);
    console.log(`  • Fraud Signals:               ${report.fraudSignalCount}`);
    console.log(`  • Fraud Rate:                  ${report.fraudRate.toFixed(2)}%\n`);

    console.log('🔍 Duplicate & Reversal Detection:');
    console.log(`  • Duplicate Detections:        ${report.duplicateDetections}`);
    console.log(`  • Reconciliation Mismatches:   ${report.reconciliationMismatches}\n`);

    console.log('✔️  Reconciliation:');
    console.log(
      `  • Reconciliation Matches:      ${report.reconciliationMatches}`,
    );
    console.log(`  • Reconciliation Pending:      ${report.reconciliationPending}`);
    console.log(`  • Reconciliation Accuracy:     ${reconciliationAccuracy}%\n`);

    console.log('⏱️  Performance:');
    console.log(
      `  • Average Processing Time:     ${report.averageProcessingTime.toFixed(2)}ms`,
    );
    console.log(
      `  • Total Processing Time:       ${report.totalProcessingTime}ms`,
    );
    console.log(`  • Total Errors:                ${report.errorCount}\n`);

    console.log('═══════════════════════════════════════════════════════\n');

    // Export report to JSON file - save to repository root
    const reportPath = path.join(process.cwd(), 'simulation-report.json');
    const reportObject = metricsService.exportToObject(report);

    // Add calculated fields to report
    const reportWithCalculated = {
      ...reportObject,
      failureRate: parseFloat(failureRate),
      reconciliationAccuracy: parseFloat(reconciliationAccuracy),
    };

    fs.writeFileSync(reportPath, JSON.stringify(reportWithCalculated, null, 2));
    console.log(`💾 Report saved to: ${reportPath}\n`);

    // Display summary
    const elapsedTime = Date.now() - startTime;
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║          Simulation Completed Successfully!            ║');
    console.log(`║  Total execution time: ${elapsedTime}ms                         ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Simulation failed with error:');
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

// Execute the simulation
runSimulation().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
