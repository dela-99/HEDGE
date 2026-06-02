"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionService = void 0;
const common_1 = require("@nestjs/common");
let IngestionService = class IngestionService {
    ingest(event) {
        if (event.verificationStatus !== 'verified') {
            throw new common_1.BadRequestException(`Event must be verified before ingestion. Current status: ${event.verificationStatus}`);
        }
        const payload = event.payloadJson || {};
        const extractedFields = [];
        const amount = this.extractAmount(payload);
        if (amount === null) {
            throw new common_1.BadRequestException('Required field missing: amount or value in event payload');
        }
        extractedFields.push('amount');
        const currency = this.extractCurrency(payload);
        if (!currency) {
            throw new common_1.BadRequestException('Required field missing: currency in event payload');
        }
        extractedFields.push('currency');
        const transactionDate = this.extractTransactionDate(payload, event.receivedAt);
        if (!transactionDate) {
            throw new common_1.BadRequestException('Required field missing: transaction date or timestamp in event payload');
        }
        extractedFields.push('transactionDate');
        const description = this.extractDescription(payload);
        if (description) {
            extractedFields.push('description');
        }
        const candidate = {
            id: this.generateCandidateId(event.provider, event.providerReference),
            provider: event.provider,
            providerReference: event.providerReference,
            amount,
            currency,
            transactionDate,
            description,
            status: 'candidate',
            metadata: {
                providerHeaders: event.headersJson,
                providerPayload: payload,
            },
            ingestedAt: new Date(),
        };
        return {
            candidate,
            rawEventId: event.id,
            extractedFields,
        };
    }
    extractAmount(payload) {
        const amountCandidates = ['amount', 'value', 'total', 'transactionAmount'];
        for (const field of amountCandidates) {
            const val = payload[field];
            if (val !== undefined && val !== null) {
                const num = Number(val);
                if (isFinite(num) && num >= 0) {
                    return num;
                }
            }
        }
        return null;
    }
    extractCurrency(payload) {
        const currencyCandidates = ['currency', 'currencyCode', 'curr'];
        for (const field of currencyCandidates) {
            const val = payload[field];
            if (val && typeof val === 'string') {
                const currency = val.toUpperCase();
                if (/^[A-Z]{3}$/.test(currency)) {
                    return currency;
                }
            }
        }
        return null;
    }
    extractTransactionDate(payload, receivedAt) {
        const dateCandidates = ['timestamp', 'date', 'transactionDate', 'createdAt'];
        for (const field of dateCandidates) {
            const val = payload[field];
            if (val !== undefined && val !== null) {
                const date = new Date(val);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        return receivedAt;
    }
    extractDescription(payload) {
        const descriptionCandidates = ['description', 'memo', 'note', 'reference'];
        for (const field of descriptionCandidates) {
            const val = payload[field];
            if (val && typeof val === 'string' && val.trim().length > 0) {
                return val.trim();
            }
        }
        return undefined;
    }
    generateCandidateId(provider, providerReference) {
        return `${provider}:${providerReference}`;
    }
};
exports.IngestionService = IngestionService;
exports.IngestionService = IngestionService = __decorate([
    (0, common_1.Injectable)()
], IngestionService);
//# sourceMappingURL=ingestion.service.js.map