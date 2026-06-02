"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const app_module_1 = require("../src/app.module");
const simulation_runner_service_1 = require("../src/simulations/simulation-runner.service");
const simulation_metrics_service_1 = require("../src/simulations/simulation-metrics.service");
const transaction_generator_service_1 = require("../src/simulations/generators/transaction-generator.service");
async function runSimulation() {
    const startTime = Date.now();
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     Financial Event Simulation - Command Started       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    let app;
    try {
        console.log('📋 Initializing application context...');
        app = await core_1.NestFactory.create(app_module_1.AppModule, {
            logger: ['error'],
        });
        const generatorService = app.get(transaction_generator_service_1.TransactionGeneratorService);
        const runnerService = app.get(simulation_runner_service_1.SimulationRunnerService);
        const metricsService = app.get(simulation_metrics_service_1.SimulationMetricsService);
        console.log('✅ Application context initialized\n');
        console.log('🔄 Generating 1000 transactions...');
        const transactions = generatorService.generateTransactions(1000);
        console.log(`✅ Generated ${transactions.length} transactions\n`);
        console.log('⚙️  Running simulation through replay engine...');
        const summary = await runnerService.replayEvents(transactions);
        console.log(`✅ Simulation completed in ${summary.duration}ms\n`);
        console.log('📊 Collecting metrics...');
        const report = metricsService.collectMetrics(summary);
        console.log('✅ Metrics collected\n');
        const failureRate = report.totalEvents > 0
            ? ((report.failedEvents / report.totalEvents) * 100).toFixed(2)
            : '0.00';
        const reconciliationAccuracy = report.matchRate.toFixed(2);
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
        console.log(`  • Reconciliation Matches:      ${report.reconciliationMatches}`);
        console.log(`  • Reconciliation Pending:      ${report.reconciliationPending}`);
        console.log(`  • Reconciliation Accuracy:     ${reconciliationAccuracy}%\n`);
        console.log('⏱️  Performance:');
        console.log(`  • Average Processing Time:     ${report.averageProcessingTime.toFixed(2)}ms`);
        console.log(`  • Total Processing Time:       ${report.totalProcessingTime}ms`);
        console.log(`  • Total Errors:                ${report.errorCount}\n`);
        console.log('═══════════════════════════════════════════════════════\n');
        const reportPath = path.join(process.cwd(), 'simulation-report.json');
        const reportObject = metricsService.exportToObject(report);
        const reportWithCalculated = {
            ...reportObject,
            failureRate: parseFloat(failureRate),
            reconciliationAccuracy: parseFloat(reconciliationAccuracy),
        };
        fs.writeFileSync(reportPath, JSON.stringify(reportWithCalculated, null, 2));
        console.log(`💾 Report saved to: ${reportPath}\n`);
        const elapsedTime = Date.now() - startTime;
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║          Simulation Completed Successfully!            ║');
        console.log(`║  Total execution time: ${elapsedTime}ms                         ║`);
        console.log('╚════════════════════════════════════════════════════════╝\n');
        process.exit(0);
    }
    catch (error) {
        console.error('\n❌ Simulation failed with error:');
        console.error(error instanceof Error ? error.message : 'Unknown error occurred');
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
    finally {
        if (app) {
            await app.close();
        }
    }
}
runSimulation().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=run-financial-simulation.js.map