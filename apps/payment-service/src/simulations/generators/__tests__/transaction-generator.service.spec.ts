import { Test, TestingModule } from '@nestjs/testing';
import { TransactionGeneratorService } from '../transaction-generator.service';

describe('TransactionGeneratorService', () => {
  let service: TransactionGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionGeneratorService],
    }).compile();

    service = module.get<TransactionGeneratorService>(TransactionGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTransactions', () => {
    it('should generate 1000 transactions by default', () => {
      const transactions = service.generateTransactions();
      expect(transactions).toHaveLength(1000);
    });

    it('should generate specified count of transactions', () => {
      const count = 500;
      const transactions = service.generateTransactions(count);
      expect(transactions).toHaveLength(count);
    });

    it('should include all required fields in transactions', () => {
      const transactions = service.generateTransactions(10);
      transactions.forEach((tx) => {
        expect(tx).toHaveProperty('transactionId');
        expect(tx).toHaveProperty('externalReference');
        expect(tx).toHaveProperty('amount');
        expect(tx).toHaveProperty('currency');
        expect(tx).toHaveProperty('merchantId');
        expect(tx).toHaveProperty('customerReference');
        expect(tx).toHaveProperty('provider');
        expect(tx).toHaveProperty('status');
        expect(tx).toHaveProperty('timestamp');
      });
    });

    it('should generate realistic amounts', () => {
      const transactions = service.generateTransactions(100);
      transactions.forEach((tx) => {
        expect(tx.amount).toBeGreaterThan(0);
        expect(tx.amount).toBeLessThanOrEqual(10000);
      });
    });

    it('should generate realistic timestamps within past 30 days', () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const transactions = service.generateTransactions(100);
      transactions.forEach((tx) => {
        expect(tx.timestamp.getTime()).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime());
        expect(tx.timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    it('should generate unique transaction IDs except for duplicates', () => {
      const transactions = service.generateTransactions(1000);
      const ids = transactions.map((tx) => tx.transactionId);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      
      // There should be some duplicates (5% of 1000 = 50)
      expect(duplicateIds.length).toBeGreaterThan(0);
    });

    it('should respect distribution percentages', () => {
      const count = 1000;
      const transactions = service.generateTransactions(count);

      const statuses: Record<string, number> = {};
      transactions.forEach((tx) => {
        statuses[tx.status] = (statuses[tx.status] || 0) + 1;
      });

      const successCount = statuses['SUCCESSFUL'] || 0;
      const failedCount = statuses['FAILED'] || 0;
      const duplicateCount = statuses['DUPLICATE'] || 0;
      const reversalCount = statuses['REVERSED'] || 0;
      const delayedCount = statuses['PENDING'] || 0;
      const suspiciousCount = statuses['SUSPICIOUS'] || 0;

      // Allow 5% variance for randomness
      const tolerance = count * 0.05;

      expect(successCount).toBeCloseTo(count * 0.7, -1);
      expect(failedCount).toBeCloseTo(count * 0.1, -1);
      expect(duplicateCount).toBeCloseTo(count * 0.05, -1);
      expect(reversalCount).toBeCloseTo(count * 0.05, -1);
      expect(delayedCount).toBeCloseTo(count * 0.05, -1);
      expect(suspiciousCount).toBeCloseTo(count * 0.05, -1);
    });

    it('should support deterministic generation with seed', () => {
      const seed = 12345;
      const transactions1 = service.generateTransactions(100, seed);
      const transactions2 = service.generateTransactions(100, seed);

      // With the same seed, the exact same transactions should be generated
      transactions1.forEach((tx1, index) => {
        const tx2 = transactions2[index];
        expect(tx1.transactionId).toBe(tx2.transactionId);
        expect(tx1.amount).toBe(tx2.amount);
        expect(tx1.currency).toBe(tx2.currency);
        expect(tx1.provider).toBe(tx2.provider);
        expect(tx1.status).toBe(tx2.status);
      });
    });

    it('should generate different transactions without seed', () => {
      const transactions1 = service.generateTransactions(100);
      
      // Add a small delay to ensure Date.now() returns different values
      const delay = new Promise(resolve => setTimeout(resolve, 10));
      
      return delay.then(() => {
        const transactions2 = service.generateTransactions(100);

        // Without seed, transactions should be different (with very high probability)
        let allIdentical = true;
        for (let i = 0; i < 100; i++) {
          if (transactions1[i].transactionId !== transactions2[i].transactionId) {
            allIdentical = false;
            break;
          }
        }
        expect(allIdentical).toBe(false);
      });
    });

    it('should have valid currencies', () => {
      const transactions = service.generateTransactions(100);
      const validCurrencies = ['USD', 'XOF', 'EUR', 'GBP', 'NGN'];
      transactions.forEach((tx) => {
        expect(validCurrencies).toContain(tx.currency);
      });
    });

    it('should have valid providers', () => {
      const transactions = service.generateTransactions(100);
      const validProviders = ['mtn', 'airtel', 'vodafone', 'moov', 'orange'];
      transactions.forEach((tx) => {
        expect(validProviders).toContain(tx.provider);
      });
    });

    it('should have valid merchant IDs', () => {
      const transactions = service.generateTransactions(100);
      const validMerchantPattern = /^MERCHANT-\d{3}$/;
      transactions.forEach((tx) => {
        expect(tx.merchantId).toMatch(validMerchantPattern);
      });
    });

    it('should have unique external references', () => {
      const transactions = service.generateTransactions(100);
      const references = transactions.map((tx) => tx.externalReference);
      const uniqueReferences = new Set(references);
      expect(uniqueReferences.size).toBe(references.length);
    });

    it('should have unique customer references', () => {
      const transactions = service.generateTransactions(100);
      const references = transactions.map((tx) => tx.customerReference);
      const uniqueReferences = new Set(references);
      expect(uniqueReferences.size).toBe(references.length);
    });
  });
});
