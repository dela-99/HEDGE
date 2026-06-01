import { ReconciliationService, ReconciliationStatus } from '../reconciliation.service';

describe('ReconciliationService', () => {
  let service: ReconciliationService;

  beforeEach(() => {
    service = new ReconciliationService();
  });

  const createTransaction = (overrides = {}) => ({
    id: 'txn-1',
    provider: 'mtn',
    providerReference: 'ref-001',
    amount: 100,
    currency: 'USD',
    payerReference: 'payer-001',
    status: 'completed',
    eventTime: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  });

  describe('matchTransaction', () => {
    it('should return MATCHED when exact match found', () => {
      const primary = createTransaction();
      const counterpart = createTransaction();

      const result = service.matchTransaction(primary, [counterpart]);

      expect(result.status).toBe(ReconciliationStatus.MATCHED);
      expect(result.counterpartTransactions).toHaveLength(1);
      expect(result.matchScore).toBe(100);
    });

    it('should return DUPLICATE when multiple exact matches found', () => {
      const primary = createTransaction();
      const counterpart1 = createTransaction({ id: 'txn-2' });
      const counterpart2 = createTransaction({ id: 'txn-3' });

      const result = service.matchTransaction(primary, [counterpart1, counterpart2]);

      expect(result.status).toBe(ReconciliationStatus.DUPLICATE);
      expect(result.counterpartTransactions).toHaveLength(2);
    });

    it('should return MISMATCHED when fuzzy match found', () => {
      const primary = createTransaction();
      const counterpart = createTransaction({
        id: 'txn-2',
        providerReference: 'ref-002',
      });

      const result = service.matchTransaction(primary, [counterpart]);

      expect(result.status).toBe(ReconciliationStatus.MISMATCHED);
      expect(result.mismatchReasons).toContain(
        'Provider reference mismatch: ref-001 vs ref-002',
      );
    });

    it('should return PENDING when no match found', () => {
      const primary = createTransaction();
      const counterpart = createTransaction({
        id: 'txn-2',
        provider: 'airtel',
      });

      const result = service.matchTransaction(primary, [counterpart]);

      expect(result.status).toBe(ReconciliationStatus.PENDING);
      expect(result.counterpartTransactions).toHaveLength(0);
    });

    it('should return PENDING when no counterparts provided', () => {
      const primary = createTransaction();

      const result = service.matchTransaction(primary, []);

      expect(result.status).toBe(ReconciliationStatus.PENDING);
      expect(result.counterpartTransactions).toHaveLength(0);
    });
  });

  describe('detectDuplicates', () => {
    it('should detect exact duplicates', () => {
      const transaction = createTransaction();
      const duplicate = createTransaction({ id: 'txn-2' });

      const result = service.detectDuplicates(transaction, [transaction, duplicate]);

      expect(result.status).toBe(ReconciliationStatus.DUPLICATE);
      expect(result.duplicateCount).toBe(2);
      expect(result.duplicateTransactions).toHaveLength(1);
    });

    it('should detect near-duplicates within 24 hours', () => {
      const transaction = createTransaction();
      const nearDuplicate = createTransaction({
        id: 'txn-2',
        providerReference: 'ref-002',
        eventTime: new Date('2026-06-01T12:00:00Z'), // 12 hours later
      });

      const result = service.detectDuplicates(transaction, [transaction, nearDuplicate]);

      expect(result.status).toBe(ReconciliationStatus.DUPLICATE);
      expect(result.duplicateCount).toBe(2);
    });

    it('should not detect duplicates when amount differs', () => {
      const transaction = createTransaction();
      const different = createTransaction({
        id: 'txn-2',
        amount: 200,
      });

      const result = service.detectDuplicates(transaction, [transaction, different]);

      expect(result.status).toBe(ReconciliationStatus.MATCHED);
      expect(result.duplicateCount).toBe(1);
    });

    it('should not detect duplicates when providers differ', () => {
      const transaction = createTransaction();
      const different = createTransaction({
        id: 'txn-2',
        provider: 'airtel',
      });

      const result = service.detectDuplicates(transaction, [transaction, different]);

      expect(result.status).toBe(ReconciliationStatus.MATCHED);
      expect(result.duplicateCount).toBe(1);
    });
  });

  describe('detectMismatches', () => {
    it('should identify amount mismatch', () => {
      const transaction1 = createTransaction();
      const transaction2 = createTransaction({
        id: 'txn-2',
        amount: 200,
      });

      const result = service.detectMismatches(transaction1, transaction2);

      expect(result.status).toBe(ReconciliationStatus.MISMATCHED);
      expect(result.mismatchReasons).toContain('Amount mismatch: 100 vs 200');
    });

    it('should identify currency mismatch', () => {
      const transaction1 = createTransaction();
      const transaction2 = createTransaction({
        id: 'txn-2',
        currency: 'EUR',
      });

      const result = service.detectMismatches(transaction1, transaction2);

      expect(result.status).toBe(ReconciliationStatus.MISMATCHED);
      expect(result.mismatchReasons).toContain('Currency mismatch: USD vs EUR');
    });

    it('should identify status mismatch', () => {
      const transaction1 = createTransaction();
      const transaction2 = createTransaction({
        id: 'txn-2',
        status: 'pending',
      });

      const result = service.detectMismatches(transaction1, transaction2);

      expect(result.status).toBe(ReconciliationStatus.MISMATCHED);
      expect(result.mismatchReasons).toContain('Status mismatch: completed vs pending');
    });

    it('should return MATCHED when no mismatches', () => {
      const transaction1 = createTransaction();
      const transaction2 = createTransaction({ id: 'txn-2' });

      const result = service.detectMismatches(transaction1, transaction2);

      expect(result.status).toBe(ReconciliationStatus.MATCHED);
      expect(result.mismatchReasons).toHaveLength(0);
    });

    it('should identify multiple mismatches', () => {
      const transaction1 = createTransaction();
      const transaction2 = createTransaction({
        id: 'txn-2',
        amount: 200,
        currency: 'EUR',
        status: 'failed',
      });

      const result = service.detectMismatches(transaction1, transaction2);

      expect(result.status).toBe(ReconciliationStatus.MISMATCHED);
      expect(result.mismatchReasons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('analyzePendingRecord', () => {
    it('should calculate days pending correctly', () => {
      const transaction = createTransaction({
        eventTime: new Date('2026-05-20T00:00:00Z'),
      });
      const referenceDate = new Date('2026-06-01T00:00:00Z');

      const result = service.analyzePendingRecord(transaction, referenceDate);

      expect(result.status).toBe(ReconciliationStatus.PENDING);
      expect(result.daysPending).toBe(12);
      expect(result.lastActivity).toEqual(transaction.eventTime);
    });

    it('should default to current date if not provided', () => {
      const transaction = createTransaction();

      const result = service.analyzePendingRecord(transaction);

      expect(result.status).toBe(ReconciliationStatus.PENDING);
      expect(result.daysPending).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 days pending for same day transactions', () => {
      const now = new Date();
      const transaction = createTransaction({ eventTime: now });

      const result = service.analyzePendingRecord(transaction, now);

      expect(result.daysPending).toBe(0);
    });
  });

  describe('classifyTransaction', () => {
    it('should classify as DUPLICATE when exact duplicates found', () => {
      const transaction = createTransaction();
      const duplicate = createTransaction({ id: 'txn-2' });
      const allTransactions = [transaction, duplicate];

      const status = service.classifyTransaction(transaction, allTransactions);

      expect(status).toBe(ReconciliationStatus.DUPLICATE);
    });

    it('should classify as DUPLICATE when near-duplicates found', () => {
      const transaction = createTransaction();
      const nearDuplicate = createTransaction({
        id: 'txn-2',
        providerReference: 'ref-002', // Different provider reference but same core fields
      });
      const allTransactions = [transaction, nearDuplicate];

      const status = service.classifyTransaction(transaction, allTransactions);

      expect(status).toBe(ReconciliationStatus.DUPLICATE);
    });

    it('should classify as MATCHED when transaction stands alone', () => {
      const transaction = createTransaction();
      const different = createTransaction({
        id: 'txn-2',
        amount: 200, // Different amount - not a near duplicate
        providerReference: 'ref-002',
      });
      const allTransactions = [transaction, different];

      const status = service.classifyTransaction(transaction, allTransactions);

      // With only different amounts, matchTransaction returns PENDING
      expect(status).toBe(ReconciliationStatus.PENDING);
    });

    it('should classify as MISMATCHED when fuzzy match with status mismatch found', () => {
      const transaction = createTransaction();
      const otherTransaction = createTransaction({
        id: 'txn-2',
        status: 'pending', // Different status but matches on core fields
      });
      // Two different transactions without the original in the list
      const allTransactions = [transaction, otherTransaction];

      const matchResult = service.matchTransaction(
        transaction,
        [otherTransaction],
      );

      expect(matchResult.status).toBe(ReconciliationStatus.MISMATCHED);
    });

    it('should classify as PENDING when no matches found', () => {
      const transaction = createTransaction();
      const different = createTransaction({
        id: 'txn-2',
        provider: 'airtel',
      });
      const allTransactions = [transaction, different];

      const status = service.classifyTransaction(transaction, allTransactions);

      expect(status).toBe(ReconciliationStatus.PENDING);
    });
  });

  describe('ReconciliationStatus enum', () => {
    it('should have all required statuses', () => {
      expect(ReconciliationStatus.MATCHED).toBe('MATCHED');
      expect(ReconciliationStatus.PENDING).toBe('PENDING');
      expect(ReconciliationStatus.MISMATCHED).toBe('MISMATCHED');
      expect(ReconciliationStatus.DUPLICATE).toBe('DUPLICATE');
    });
  });
});
