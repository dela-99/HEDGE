"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TransactionGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionGeneratorService = void 0;
const common_1 = require("@nestjs/common");
let TransactionGeneratorService = TransactionGeneratorService_1 = class TransactionGeneratorService {
    logger = new common_1.Logger(TransactionGeneratorService_1.name);
    providers = ['mtn', 'airtel', 'vodafone', 'moov', 'orange'];
    currencies = ['USD', 'XOF', 'EUR', 'GBP', 'NGN'];
    merchantIds = [
        'MERCHANT-001',
        'MERCHANT-002',
        'MERCHANT-003',
        'MERCHANT-004',
        'MERCHANT-005',
        'MERCHANT-006',
        'MERCHANT-007',
        'MERCHANT-008',
        'MERCHANT-009',
        'MERCHANT-010',
    ];
    seed = 0;
    seedMultiplier = 9301;
    seedIncrement = 49297;
    seedModulus = 233280;
    generateTransactions(count = 1000, seed) {
        this.seed = seed || Date.now();
        const transactions = [];
        const usedIds = new Set();
        const duplicateIndices = [];
        const successCount = Math.floor(count * 0.7);
        const failedCount = Math.floor(count * 0.1);
        const duplicateCount = Math.floor(count * 0.05);
        const reversalCount = Math.floor(count * 0.05);
        const delayedCount = Math.floor(count * 0.05);
        const suspiciousCount = count - successCount - failedCount - duplicateCount - reversalCount - delayedCount;
        for (let i = 0; i < count; i++) {
            let transactionId;
            let isOriginalDuplicate = false;
            if (i < duplicateCount && duplicateIndices.length > 0) {
                const originalIndex = duplicateIndices[i % duplicateIndices.length];
                transactionId = transactions[originalIndex].transactionId;
            }
            else {
                transactionId = this.generateUniqueId('TXN', usedIds);
                if (i < duplicateCount + successCount) {
                    duplicateIndices.push(i);
                }
                isOriginalDuplicate = false;
            }
            const transaction = {
                transactionId,
                externalReference: this.generateUniqueId('EXT', new Set()),
                amount: this.generateRealisticAmount(),
                currency: this.randomElement(this.currencies),
                merchantId: this.randomElement(this.merchantIds),
                customerReference: this.generateUniqueId('CUST', new Set()),
                provider: this.randomElement(this.providers),
                status: this.determineStatus(i, count, successCount, failedCount, duplicateCount, reversalCount, delayedCount),
                timestamp: this.generateRealisticTimestamp(),
            };
            transactions.push(transaction);
        }
        this.logger.log(`Generated ${count} transactions with deterministic seed: ${this.seed}`);
        return transactions;
    }
    determineStatus(index, total, successCount, failedCount, duplicateCount, reversalCount, delayedCount) {
        let currentIndex = 0;
        if (index < currentIndex + successCount) {
            return 'SUCCESSFUL';
        }
        currentIndex += successCount;
        if (index < currentIndex + failedCount) {
            return 'FAILED';
        }
        currentIndex += failedCount;
        if (index < currentIndex + duplicateCount) {
            return 'DUPLICATE';
        }
        currentIndex += duplicateCount;
        if (index < currentIndex + reversalCount) {
            return 'REVERSED';
        }
        currentIndex += reversalCount;
        if (index < currentIndex + delayedCount) {
            return 'PENDING';
        }
        return 'SUSPICIOUS';
    }
    generateUniqueId(prefix, usedIds) {
        let id;
        let attempts = 0;
        const maxAttempts = 100;
        do {
            id = `${prefix}-${this.randomInt(100000, 999999)}`;
            attempts++;
        } while (usedIds.has(id) && attempts < maxAttempts);
        usedIds.add(id);
        return id;
    }
    generateRealisticAmount() {
        const rand = this.random();
        if (rand < 0.6) {
            return Math.round((this.random() * 49.5 + 0.5) * 100) / 100;
        }
        else if (rand < 0.9) {
            return Math.round((this.random() * 450 + 50) * 100) / 100;
        }
        else {
            return Math.round((this.random() * 9500 + 500) * 100) / 100;
        }
    }
    generateRealisticTimestamp() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const randomMs = this.randomInt(0, Math.floor(now.getTime() - thirtyDaysAgo.getTime()));
        return new Date(thirtyDaysAgo.getTime() + randomMs);
    }
    random() {
        this.seed = (this.seed * this.seedMultiplier + this.seedIncrement) % this.seedModulus;
        return this.seed / this.seedModulus;
    }
    randomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }
    randomElement(array) {
        const index = this.randomInt(0, array.length - 1);
        return array[index];
    }
};
exports.TransactionGeneratorService = TransactionGeneratorService;
exports.TransactionGeneratorService = TransactionGeneratorService = TransactionGeneratorService_1 = __decorate([
    (0, common_1.Injectable)()
], TransactionGeneratorService);
//# sourceMappingURL=transaction-generator.service.js.map