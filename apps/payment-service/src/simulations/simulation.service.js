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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SimulationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const raw_events_service_1 = require("../raw-events/raw-events.service");
const ingestion_service_1 = require("../ingestion/ingestion.service");
const normalization_service_1 = require("../normalization/normalization.service");
let SimulationService = SimulationService_1 = class SimulationService {
    rawEventsService;
    ingestionService;
    normalizationService;
    logger = new common_1.Logger(SimulationService_1.name);
    fixturesDir = path.join(__dirname, 'fixtures');
    constructor(rawEventsService, ingestionService, normalizationService) {
        this.rawEventsService = rawEventsService;
        this.ingestionService = ingestionService;
        this.normalizationService = normalizationService;
    }
    async simulateFixture(fixtureId) {
        const result = {
            fixtureId,
            provider: '',
            status: 'failure',
            errors: [],
            executedAt: new Date(),
        };
        try {
            const fixtureData = this.loadFixtureData(fixtureId);
            result.provider = fixtureData.provider;
            const verifiedEvent = this.createVerifiedEvent(fixtureData);
            const rawEvent = await this.rawEventsService.storeEvent({
                provider: verifiedEvent.provider,
                eventType: fixtureData.eventType,
                providerReference: verifiedEvent.providerReference,
                headersJson: verifiedEvent.headersJson,
                payloadJson: verifiedEvent.payloadJson,
                receivedAt: verifiedEvent.receivedAt,
                verificationStatus: 'verified',
            });
            result.rawEventId = rawEvent.id;
            this.logger.debug(`Raw event stored: ${rawEvent.id}`);
            const ingestionResult = this.ingestionService.ingest(verifiedEvent);
            result.ingestedCandidate = ingestionResult.candidate;
            this.logger.debug(`Transaction ingested: ${ingestionResult.candidate.id}`);
            const normalizedTransaction = this.normalizationService.normalize(fixtureData.provider, fixtureData.payloadJson);
            result.normalizedTransaction = normalizedTransaction;
            this.logger.debug(`Transaction normalized for provider: ${fixtureData.provider}`);
            result.status = 'success';
            this.logger.log(`Fixture simulation successful: ${fixtureId}`);
        }
        catch (error) {
            result.status = 'failure';
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(errorMessage);
            this.logger.error(`Fixture simulation failed: ${fixtureId}`, errorMessage);
        }
        return result;
    }
    loadFixtureData(fixtureId) {
        const fixtureFilePath = path.join(this.fixturesDir, `${fixtureId}.json`);
        try {
            const fileContent = fs.readFileSync(fixtureFilePath, 'utf-8');
            const data = JSON.parse(fileContent);
            if (!data.provider) {
                throw new common_1.BadRequestException('Fixture must have provider field');
            }
            if (!data.providerReference) {
                throw new common_1.BadRequestException('Fixture must have providerReference field');
            }
            if (!data.payloadJson || typeof data.payloadJson !== 'object') {
                throw new common_1.BadRequestException('Fixture must have payloadJson field');
            }
            if (!data.eventType) {
                throw new common_1.BadRequestException('Fixture must have eventType field');
            }
            return data;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to load fixture '${fixtureId}': ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    createVerifiedEvent(fixtureData) {
        return {
            id: `sim:${fixtureData.provider}:${fixtureData.providerReference}:${Date.now()}`,
            provider: fixtureData.provider,
            providerReference: fixtureData.providerReference,
            payloadJson: fixtureData.payloadJson,
            headersJson: fixtureData.headersJson || {},
            receivedAt: fixtureData.receivedAt ? new Date(fixtureData.receivedAt) : new Date(),
            verificationStatus: 'verified',
        };
    }
    getAvailableFixtures() {
        try {
            const files = fs.readdirSync(this.fixturesDir);
            return files
                .filter((file) => file.endsWith('.json'))
                .map((file) => file.replace('.json', ''));
        }
        catch (error) {
            this.logger.warn('Failed to list fixtures:', error);
            return [];
        }
    }
};
exports.SimulationService = SimulationService;
exports.SimulationService = SimulationService = SimulationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [raw_events_service_1.RawEventsService,
        ingestion_service_1.IngestionService,
        normalization_service_1.NormalizationService])
], SimulationService);
//# sourceMappingURL=simulation.service.js.map