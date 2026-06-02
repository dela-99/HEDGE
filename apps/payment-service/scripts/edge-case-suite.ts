#!/usr/bin/env node

/**
 * Edge-Case Simulation Suite CLI
 * 
 * Executes comprehensive edge-case scenarios and generates scenario-results.json report.
 * 
 * Usage:
 *   npm run edge-case-suite
 */

import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { EdgeCaseScenarioRunner } from '../simulations/edge-case-scenario-runner';

const logger = new Logger('EdgeCaseSuiteRunner');

async function bootstrap() {
  try {
    logger.log('Initializing Edge-Case Simulation Suite...');

    // Create Nest application for dependency injection
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false, // Suppress Nest bootstrap logs
    });

    // Get the edge-case runner service
    const runner = app.get(EdgeCaseScenarioRunner);

    logger.log('Running edge-case scenarios (8 scenarios)...');
    logger.log('');

    // Execute all scenarios
    const report = await runner.runAllScenarios();

    logger.log('');
    logger.log('='.repeat(70));
    logger.log('EDGE-CASE SIMULATION SUITE REPORT');
    logger.log('='.repeat(70));
    logger.log(`Timestamp: ${report.timestamp.toISOString()}`);
    logger.log(`Total Scenarios: ${report.totalScenarios}`);
    logger.log(`Passed: ${report.passedScenarios}`);
    logger.log(`Failed: ${report.failedScenarios}`);
    logger.log(`Pass Rate: ${report.passRate}%`);
    logger.log('='.repeat(70));
    logger.log('');

    // Print individual scenario results
    logger.log('SCENARIO RESULTS:');
    logger.log('');
    for (const result of report.scenarios) {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      logger.log(`${status}: ${result.scenario.id} - ${result.scenario.name}`);
      logger.log(`   ${result.message}`);
      if (result.scenario.description) {
        logger.log(`   Description: ${result.scenario.description}`);
      }
      if (result.details.errors && result.details.errors.length > 0) {
        logger.log(`   Errors: ${result.details.errors.join(', ')}`);
      }
      logger.log('');
    }

    logger.log('='.repeat(70));
    logger.log('');

    // Save report to file
    const reportPath = await runner.saveReportToFile(report);
    logger.log(`✓ Report saved to: ${reportPath}`);
    logger.log('');

    // Exit with appropriate code
    const exitCode = report.failedScenarios > 0 ? 1 : 0;
    logger.log(`Suite execution completed with exit code: ${exitCode}`);

    await app.close();
    process.exit(exitCode);
  } catch (error) {
    logger.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    logger.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

// Run bootstrap
bootstrap();
