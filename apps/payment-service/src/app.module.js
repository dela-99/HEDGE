"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const configuration_1 = __importDefault(require("./config/configuration"));
const database_module_1 = require("./database/database.module");
const ingestion_module_1 = require("./ingestion/ingestion.module");
const raw_events_module_1 = require("./raw-events/raw-events.module");
const normalization_module_1 = require("./normalization/normalization.module");
const reconciliation_module_1 = require("./reconciliation/reconciliation.module");
const fraud_module_1 = require("./fraud/fraud.module");
const analytics_module_1 = require("./analytics/analytics.module");
const simulation_module_1 = require("./simulations/simulation.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env', 'apps/payment-service/.env'],
                load: [configuration_1.default],
            }),
            database_module_1.DatabaseModule,
            raw_events_module_1.RawEventsModule,
            ingestion_module_1.IngestionModule,
            normalization_module_1.NormalizationModule,
            reconciliation_module_1.ReconciliationModule,
            fraud_module_1.FraudModule,
            analytics_module_1.AnalyticsModule,
            simulation_module_1.SimulationModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map