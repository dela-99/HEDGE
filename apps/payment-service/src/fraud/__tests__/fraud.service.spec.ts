import { Test, TestingModule } from '@nestjs/testing';
import {
  FraudService,
  FraudSignalType,
  TransactionForFraudAnalysis,
} from '../fraud.service';

describe('FraudService', () => {
  let service: FraudService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FraudService],
    }).compile();

    service = module.get<FraudService>(FraudService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzTransaction', () => {
    it('should return empty array for clean transaction', () => {
      const transaction: TransactionForFraudAnalysis = {
        id: 'tx-1',
        provider: 'stripe',
        providerReference: 'ch-123',
        amount: 100,
        currency: 'USD',
        transactionDate: new Date(),
        payerReference: 'user-1',
        description: 'Test transaction',
      };

      const signals = service.analyzTransaction(transaction);
      expect(signals).toEqual([]);
    });

    it('should detect duplicate transaction signal', () => {
      const now = new Date();
      const transaction: TransactionForFraudAnalysis = {
        id: 'tx-2',
        provider: 'stripe',
        providerReference: 'ch-123',
        amount: 100,
        currency: 'USD',
        transactionDate: now,
        payerReference: 'user-1',
      };

      const history: TransactionForFraudAnalysis[] = [
        {
          id: 'tx-1',
          provider: 'stripe',
          providerReference: 'ch-123',
          amount: 100,
          currency: 'USD',
          transactionDate: new Date(now.getTime() - 60 * 1000), // 1 minute ago
          payerReference: 'user-1',
        },
      ];

      const signals = service.analyzTransaction(transaction, history);
      expect(signals.length).toBe(1);
      expect(signals[0].signalType).toBe(FraudSignalType.DUPLICATE_TRANSACTION);
      expect(signals[0].severity).toBe('high');
    });

    it('should detect unusual amount signal for zero amount', () => {
      const transaction: TransactionForFraudAnalysis = {
        id: 'tx-3',
        provider: 'stripe',
        providerReference: 'ch-456',
        amount: 0,
        currency: 'USD',
        transactionDate: new Date(),
        payerReference: 'user-2',
      };

      const signals = service.analyzTransaction(transaction);
      expect(signals.length).toBe(1);
      expect(signals[0].signalType).toBe(FraudSignalType.UNUSUAL_AMOUNT);
      expect(signals[0].severity).toBe('low');
    });

    it('should detect unusual amount signal for negative amount', () => {
      const transaction: TransactionForFraudAnalysis = {
        id: 'tx-4',
        provider: 'stripe',
        providerReference: 'ch-789',
        amount: -50,
        currency: 'USD',
        transactionDate: new Date(),
        payerReference: 'user-3',
      };

      const signals = service.analyzTransaction(transaction);
      expect(signals.length).toBe(1);
      expect(signals[0].signalType).toBe(FraudSignalType.UNUSUAL_AMOUNT);
      expect(signals[0].severity).toBe('medium');
    });

    it('should detect rapid repeated attempts signal', () => {
      const now = new Date();
      const transaction: TransactionForFraudAnalysis = {
        id: 'tx-5',
        provider: 'stripe',
        providerReference: 'ch-999',
        amount: 50,
        currency: 'USD',
        transactionDate: now,
        payerReference: 'user-4',
      };

      const history: TransactionForFraudAnalysis[] = [
        {
          id: 'tx-attempt-1',
          provider: 'stripe',
          providerReference: 'ch-aaa',
          amount: 50,
          currency: 'USD',
          transactionDate: new Date(now.getTime() - 30 * 1000), // 30 seconds ago
          payerReference: 'user-4',
        },
        {
          id: 'tx-attempt-2',
          provider: 'stripe',
          providerReference: 'ch-bbb',
          amount: 50,
          currency: 'USD',
          transactionDate: new Date(now.getTime() - 20 * 1000), // 20 seconds ago
          payerReference: 'user-4',
        },
      ];

      const signals = service.analyzTransaction(transaction, history);
      expect(signals.length).toBe(1);
      expect(signals[0].signalType).toBe(FraudSignalType.RAPID_REPEATED_ATTEMPTS);
      expect(signals[0].severity).toBe('high');
    });

    it('should detect unknown reference signal for missing provider reference', () => {
      const transaction: TransactionForFraudAnalysis = {
        id: 'tx-6',
        provider: 'stripe',
        providerReference: '',
        amount: 100,
        currency: 'USD',
        transactionDate: new Date(),
        payerReference: 'user-5',
      };

      const signals = service.analyzTransaction(transaction);
      expect(signals.length).toBe(1);
      expect(signals[0].signalType).toBe(FraudSignalType.UNKNOWN_REFERENCE);
      expect(signals[0].severity).toBe('high');
    });

    it('should detect multiple signals', () => {
      const transaction: TransactionForFraudAnalysis = {
        id: 'tx-7',
        provider: 'stripe',
        providerReference: '',
        amount: 0,
        currency: 'USD',
        transactionDate: new Date(),
        payerReference: 'user-6',
      };

      const signals = service.analyzTransaction(transaction);
      expect(signals.length).toBeGreaterThan(1);
      expect(signals.map((s) => s.signalType)).toContain(
        FraudSignalType.UNKNOWN_REFERENCE,
      );
      expect(signals.map((s) => s.signalType)).toContain(
        FraudSignalType.UNUSUAL_AMOUNT,
      );
    });
  });
});
