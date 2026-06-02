"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationModule = void 0;
const common_1 = require("@nestjs/common");
const raw_events_module_1 = require("../raw-events/raw-events.module");
const ingestion_module_1 = require("../ingestion/ingestion.module");
const normalization_module_1 = require("../normalization/normalization.module");
const fraud_module_1 = require("../fraud/fraud.module");
const reconciliation_module_1 = require("../reconciliation/reconciliation.module");
const analytics_module_1 = require("../analytics/analytics.module");
const simulation_service_1 = require("./simulation.service");
const simulation_runner_service_1 = require("./simulation-runner.service");
const simulation_metrics_service_1 = require("./simulation-metrics.service");
const transaction_generator_service_1 = require("./generators/transaction-generator.service");
let SimulationModule = class SimulationModule {
};
exports.SimulationModule = SimulationModule;
exports.SimulationModule = SimulationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            raw_events_module_1.RawEventsModule,
            ingestion_module_1.IngestionModule,
            normalization_module_1.NormalizationModule,
            fraud_module_1.FraudModule,
            reconciliation_module_1.ReconciliationModule,
            analytics_module_1.AnalyticsModule,
        ],
        providers: [simulation_service_1.SimulationService, simulation_runner_service_1.SimulationRunnerService, simulation_metrics_service_1.SimulationMetricsService, transaction_generator_service_1.TransactionGeneratorService],
        exports: [simulation_service_1.SimulationService, simulation_runner_service_1.SimulationRunnerService, simulation_metrics_service_1.SimulationMetricsService, transaction_generator_service_1.TransactionGeneratorService],
    })
], SimulationModule);
//# sourceMappingURL=simulation.module.js.map