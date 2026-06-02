"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NormalizationService = void 0;
const common_1 = require("@nestjs/common");
class MtnProvider {
    PROVIDER_NAME = 'mtn';
    map(payload) {
        this.validateRequiredFields(payload);
        const payerReference = this.extractPayerReference(payload);
        if (!payerReference) {
            throw new common_1.BadRequestException('Required field missing: payerReference (externalId) in MTN payload');
        }
        return {
            provider: this.PROVIDER_NAME,
            providerReference: payload.transactionId,
            amount: payload.amount,
            currency: payload.currency,
            payerReference,
            status: this.normalizeStatus(payload.status),
            eventTime: this.extractEventTime(payload),
        };
    }
    validateRequiredFields(payload) {
        const requiredFields = ['transactionId', 'amount', 'currency', 'status'];
        for (const field of requiredFields) {
            if (payload[field] === undefined || payload[field] === null) {
                throw new common_1.BadRequestException(`Required field missing: ${field} in MTN payload`);
            }
        }
        if (typeof payload.transactionId !== 'string') {
            throw new common_1.BadRequestException('transactionId must be a string');
        }
        if (typeof payload.amount !== 'number' || !isFinite(payload.amount)) {
            throw new common_1.BadRequestException('amount must be a finite number');
        }
        if (typeof payload.currency !== 'string') {
            throw new common_1.BadRequestException('currency must be a string');
        }
        if (typeof payload.status !== 'string') {
            throw new common_1.BadRequestException('status must be a string');
        }
    }
    extractPayerReference(payload) {
        if (payload.externalId && typeof payload.externalId === 'string') {
            return payload.externalId;
        }
        if (payload.payer && typeof payload.payer === 'object') {
            if (payload.payer.partyId &&
                typeof payload.payer.partyId === 'string') {
                return payload.payer.partyId;
            }
            if (payload.payer.partyIdType &&
                payload.payer.partyId &&
                typeof payload.payer.partyId === 'string') {
                return payload.payer.partyId;
            }
        }
        return null;
    }
    extractEventTime(payload) {
        let timeString = payload.timestamp || payload.requestTimestamp;
        if (!timeString) {
            throw new common_1.BadRequestException('Required field missing: timestamp or requestTimestamp in MTN payload');
        }
        const date = new Date(timeString);
        if (isNaN(date.getTime())) {
            throw new common_1.BadRequestException(`Invalid date format for eventTime: ${timeString}`);
        }
        return date;
    }
    normalizeStatus(mtnStatus) {
        const statusMap = {
            SUCCESSFUL: 'completed',
            SUCCESS: 'completed',
            FAILED: 'failed',
            PENDING: 'pending',
            REJECTED: 'rejected',
        };
        return statusMap[mtnStatus.toUpperCase()] || mtnStatus.toLowerCase();
    }
}
let NormalizationService = class NormalizationService {
    providers;
    constructor() {
        this.providers = new Map();
        this.registerProvider('mtn', new MtnProvider());
    }
    registerProvider(providerName, provider) {
        this.providers.set(providerName.toLowerCase(), provider);
    }
    normalize(provider, payload) {
        const providerMapper = this.providers.get(provider.toLowerCase());
        if (!providerMapper) {
            throw new common_1.BadRequestException(`Unsupported provider: ${provider}. Supported providers: ${Array.from(this.providers.keys()).join(', ')}`);
        }
        return providerMapper.map(payload);
    }
    getSupportedProviders() {
        return Array.from(this.providers.keys());
    }
};
exports.NormalizationService = NormalizationService;
exports.NormalizationService = NormalizationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], NormalizationService);
//# sourceMappingURL=normalization.service.js.map