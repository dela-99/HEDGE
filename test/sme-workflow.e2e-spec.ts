import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { AuditService } from '../apps/auth-service/src/audit/audit.service';
import { AuthService } from '../apps/auth-service/src/auth/auth.service';
import { SessionsService } from '../apps/auth-service/src/sessions/sessions.service';
import { UsersService } from '../apps/auth-service/src/users/users.service';
import { AnalyticsService } from '../apps/payment-service/src/analytics/analytics.service';
import { DashboardService } from '../apps/payment-service/src/dashboard/dashboard.service';
import { FraudService } from '../apps/payment-service/src/fraud/fraud.service';
import { IngestionService } from '../apps/payment-service/src/ingestion/ingestion.service';
import { LinkedAccountsService } from '../apps/payment-service/src/linked-accounts/linked-accounts.service';
import { NormalizationService } from '../apps/payment-service/src/normalization/normalization.service';
import {
  ReconciliationService,
  ReconciliationStatus,
} from '../apps/payment-service/src/reconciliation/reconciliation.service';
import { RawEventsService } from '../apps/payment-service/src/raw-events/raw-events.service';
import { TeamService } from '../apps/payment-service/src/team/team.service';
import {
  BusinessRole,
  LinkedAccountStatus,
  PaymentProvider,
} from '../apps/generated/prisma-client-payment';

type StepStatus = 'passed' | 'failed' | 'gap';

interface WorkflowStep {
  name: string;
  status: StepStatus;
  details?: string;
}

class InMemoryAuthPrisma {
  users: any[] = [];
  sessions: any[] = [];
  auditLogs: any[] = [];

  user = {
    findUnique: async ({ where }: any) => {
      if (where.email) {
        return this.users.find((user) => user.email === where.email) ?? null;
      }

      return this.users.find((user) => user.id === where.id) ?? null;
    },
    create: async ({ data }: any) => {
      const now = new Date();
      const user = {
        id: `user-${this.users.length + 1}`,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        isVerified: false,
        mfaEnabled: false,
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.users.push(user);
      return user;
    },
    update: async ({ where, data }: any) => {
      const user = this.users.find((candidate) => candidate.id === where.id);
      if (!user) {
        throw new Error('User not found');
      }

      Object.assign(user, data, { updatedAt: new Date() });
      return user;
    },
  };

  session = {
    create: async ({ data }: any) => {
      const session = {
        ...data,
        revoked: false,
        lastActiveAt: new Date(),
        createdAt: new Date(),
      };
      this.sessions.push(session);
      return session;
    },
    findUnique: async ({ where }: any) =>
      this.sessions.find((session) => session.id === where.id) ?? null,
    findMany: async ({ where }: any) =>
      this.sessions.filter(
        (session) =>
          session.userId === where.userId &&
          session.revoked === where.revoked &&
          session.expiresAt > where.expiresAt.gt,
      ),
    update: async ({ where, data }: any) => {
      const session = this.sessions.find((candidate) => candidate.id === where.id);
      if (!session) {
        throw new Error('Session not found');
      }

      Object.assign(session, data);
      return session;
    },
    updateMany: async ({ where, data }: any) => {
      const matching = this.sessions.filter(
        (session) => session.userId === where.userId && session.revoked === where.revoked,
      );
      matching.forEach((session) => Object.assign(session, data));
      return { count: matching.length };
    },
  };

  auditLog = {
    create: async ({ data }: any) => {
      const auditLog = {
        id: `audit-${this.auditLogs.length + 1}`,
        ...data,
        createdAt: new Date(),
      };
      this.auditLogs.push(auditLog);
      return auditLog;
    },
  };
}

class InMemoryPaymentPrisma {
  merchants: any[] = [];
  businesses: any[] = [];
  businessMembers: any[] = [];
  linkedAccounts: any[] = [];
  rawFinancialEvents: any[] = [];

  merchant = {
    findUnique: async ({ where }: any) => {
      if (where.email) {
        return this.merchants.find((merchant) => merchant.email === where.email) ?? null;
      }

      return this.merchants.find((merchant) => merchant.id === where.id) ?? null;
    },
    create: async ({ data }: any) => {
      const now = new Date();
      const merchant = {
        id: `merchant-${this.merchants.length + 1}`,
        ...data,
        businesses: [],
        createdAt: now,
        updatedAt: now,
      };
      this.merchants.push(merchant);
      return merchant;
    },
  };

  business = {
    findUnique: async ({ where }: any) =>
      this.businesses.find((business) => business.id === where.id) ?? null,
    create: async ({ data }: any) => {
      const now = new Date();
      const business = {
        id: `business-${this.businesses.length + 1}`,
        isActive: true,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      this.businesses.push(business);
      return business;
    },
  };

  businessMember = {
    create: async ({ data }: any) => {
      const duplicate = this.businessMembers.find(
        (member) => member.businessId === data.businessId && member.userId === data.userId,
      );
      if (duplicate) {
        throw new Error('Duplicate business membership');
      }

      const now = new Date();
      const member = {
        id: `member-${this.businessMembers.length + 1}`,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      this.businessMembers.push(member);
      return member;
    },
    findUnique: async ({ where }: any) =>
      this.businessMembers.find((member) => member.id === where.id) ?? null,
    findMany: async ({ where }: any) =>
      this.businessMembers.filter((member) => member.businessId === where.businessId),
    update: async ({ where, data }: any) => {
      const member = this.businessMembers.find((candidate) => candidate.id === where.id);
      if (!member) {
        throw new Error('Business member not found');
      }

      Object.assign(member, data, { updatedAt: new Date() });
      return member;
    },
    delete: async ({ where }: any) => {
      const index = this.businessMembers.findIndex((member) => member.id === where.id);
      if (index < 0) {
        throw new Error('Business member not found');
      }

      return this.businessMembers.splice(index, 1)[0];
    },
  };

  linkedAccount = {
    create: async ({ data }: any) => {
      const now = new Date();
      const linkedAccount = {
        id: `linked-account-${this.linkedAccounts.length + 1}`,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      this.linkedAccounts.push(linkedAccount);
      return linkedAccount;
    },
  };

  rawFinancialEvent = {
    create: async ({ data }: any) => {
      const rawEvent = {
        id: `raw-event-${this.rawFinancialEvents.length + 1}`,
        ...data,
        createdAt: new Date(),
      };
      this.rawFinancialEvents.push(rawEvent);
      return rawEvent;
    },
    findMany: async ({ where }: any) =>
      this.rawFinancialEvents.filter(
        (event) => event.providerReference === where.providerReference,
      ),
  };
}

describe('SME workflow validation (e2e)', () => {
  const steps: WorkflowStep[] = [];

  const record = (name: string, status: StepStatus, details?: string) => {
    steps.push({ name, status, details });
  };

  afterEach(() => {
    steps.length = 0;
  });

  it('validates the complete merchant journey against current platform capabilities', async () => {
    const authPrisma = new InMemoryAuthPrisma();
    const paymentPrisma = new InMemoryPaymentPrisma();

    const usersService = new UsersService(authPrisma as any);
    const sessionsService = new SessionsService(authPrisma as any);
    const auditService = new AuditService(authPrisma as any);
    const authService = new AuthService(
      usersService,
      sessionsService,
      auditService,
      new JwtService(),
      new ConfigService({
        jwt: {
          accessSecret: 'test-access-secret',
          refreshSecret: 'test-refresh-secret',
          accessExpiresIn: '15m',
          refreshExpiresIn: '7d',
        },
      }),
    );

    const teamService = new TeamService(paymentPrisma as any);
    const linkedAccountsService = new LinkedAccountsService(paymentPrisma as any);
    const rawEventsService = new RawEventsService(paymentPrisma as any);
    const ingestionService = new IngestionService();
    const normalizationService = new NormalizationService();
    const fraudService = new FraudService();
    const reconciliationService = new ReconciliationService();
    const analyticsService = new AnalyticsService();
    const dashboardService = new DashboardService(
      analyticsService,
      reconciliationService,
      fraudService,
    );

    const context = {
      ipAddress: '127.0.0.1',
      deviceInfo: 'sme-workflow-e2e',
    };

    const registration = await authService.register(
      { email: 'owner@example.com', password: 'SecurePass123!' },
      context,
    );
    expect(registration.user.email).toBe('owner@example.com');
    record('register user', 'passed');

    const userWithPassword = await usersService.findByEmail('owner@example.com');
    expect(userWithPassword).toBeTruthy();
    const login = await authService.login(userWithPassword!, context);
    expect(login.sessionId).toBeTruthy();
    record('login', 'passed');

    const signupAudit = authPrisma.auditLogs.find((entry) => entry.action === 'signup');
    const loginAudit = authPrisma.auditLogs.find((entry) => entry.action === 'login');
    expect(signupAudit).toBeTruthy();
    expect(loginAudit).toBeTruthy();
    record('verify audit logs are created', 'passed');

    const activeSession = await sessionsService.findSessionById(login.sessionId);
    expect(activeSession?.revoked).toBe(false);
    expect(activeSession?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    record('verify session remains active', 'passed');

    const merchant = await paymentPrisma.merchant.create({
      data: {
        name: 'Owner Merchant',
        email: 'owner@example.com',
        isActive: true,
      },
    });
    const business = await paymentPrisma.business.create({
      data: {
        merchantId: merchant.id,
        name: 'Owner Trading',
        businessType: 'retail',
        registrationNumber: 'SME-001',
      },
    });
    record(
      'create business',
      'gap',
      'No production BusinessService/controller exists in payment-service; business was seeded through persistence boundary for downstream validation.',
    );

    const member = await teamService.inviteMember({
      businessId: business.id,
      userId: registration.user.id,
      role: BusinessRole.FINANCE_MANAGER,
    });
    expect(member.businessId).toBe(business.id);
    record('invite team member', 'passed');

    const linkedAccount = await linkedAccountsService.createLinkedAccount({
      merchantId: merchant.id,
      businessId: business.id,
      provider: PaymentProvider.MTN_MOMO,
      providerAccountId: 'mtn-account-001',
      status: LinkedAccountStatus.ACTIVE,
    });
    expect(linkedAccount.provider).toBe(PaymentProvider.MTN_MOMO);
    record('create linked account', 'passed');

    const receivedAt = new Date();
    const mtnPayload = {
      transactionId: 'txn-sme-001',
      externalId: 'payer-001',
      amount: 250,
      currency: 'GHS',
      status: 'SUCCESSFUL',
      timestamp: receivedAt.toISOString(),
      payer: {
        partyIdType: 'MSISDN',
        partyId: '233240000001',
      },
    };
    record('simulate MTN payment event', 'passed');

    const rawEvent = await rawEventsService.storeEvent({
      provider: 'mtn',
      eventType: 'payment.completed',
      providerReference: mtnPayload.transactionId,
      headersJson: { 'x-provider': 'mtn' },
      payloadJson: mtnPayload,
      receivedAt,
      verificationStatus: 'verified',
    });
    expect(rawEvent.id).toBeTruthy();
    record('store raw event', 'passed');

    const ingestion = ingestionService.ingest(rawEvent);
    expect(ingestion.rawEventId).toBe(rawEvent.id);
    record('run ingestion pipeline', 'passed');

    const normalized = normalizationService.normalize('mtn', mtnPayload);
    expect(normalized.providerReference).toBe(mtnPayload.transactionId);
    record('normalize transaction', 'passed');

    const fraudSignals = fraudService.analyzTransaction({
      id: ingestion.candidate.id,
      provider: normalized.provider,
      providerReference: normalized.providerReference,
      amount: normalized.amount,
      currency: normalized.currency,
      transactionDate: normalized.eventTime,
      payerReference: normalized.payerReference,
    });
    expect(fraudSignals).toHaveLength(0);
    record(
      'run fraud checks',
      'passed',
      'No fraud signals generated for the clean MTN event; service returns signals when suspicious inputs are provided.',
    );

    const suspiciousSignals = fraudService.analyzTransaction({
      id: 'txn-sme-suspicious',
      provider: 'mtn',
      providerReference: '',
      amount: -1,
      currency: 'GHS',
      transactionDate: receivedAt,
      payerReference: '',
    });
    expect(suspiciousSignals.length).toBeGreaterThan(0);
    record('verify fraud signals generated when applicable', 'passed');

    const reconciliationBefore = reconciliationService.matchTransaction(
      {
        id: normalized.providerReference,
        provider: normalized.provider,
        providerReference: normalized.providerReference,
        amount: normalized.amount,
        currency: normalized.currency,
        payerReference: normalized.payerReference,
        status: normalized.status,
        eventTime: normalized.eventTime,
      },
      [],
    );
    expect(reconciliationBefore.status).toBe(ReconciliationStatus.PENDING);

    const reconciliationAfter = reconciliationService.matchTransaction(
      reconciliationBefore.primaryTransaction,
      [{ ...reconciliationBefore.primaryTransaction, id: 'settlement-txn-sme-001' }],
    );
    expect(reconciliationAfter.status).toBe(ReconciliationStatus.MATCHED);
    record('verify reconciliation status changes correctly', 'passed');

    const analytics = analyticsService.generateDailyMetrics(
      [
        {
          id: ingestion.candidate.id,
          provider: normalized.provider,
          providerReference: normalized.providerReference,
          amount: normalized.amount,
          currency: normalized.currency,
          transactionDate: normalized.eventTime,
          status: 'succeeded',
        } as any,
      ],
      new Date(receivedAt.getTime() - 60_000),
      new Date(receivedAt.getTime() + 60_000),
    );
    expect(analytics.totalRevenue).toBe(250);
    record('generate analytics', 'passed');

    const dashboardSummary = dashboardService.getSummary();
    if (dashboardSummary.totalTransactions !== analytics.totalTransactions) {
      record(
        'update dashboard metrics',
        'failed',
        'DashboardService uses private empty transaction/reconciliation/fraud sources, so endpoints do not reflect pipeline outputs.',
      );
    } else {
      record('update dashboard metrics', 'passed');
    }

    const workflowPassed = steps.every((step) => step.status === 'passed');
    const failedSteps = steps.filter((step) => step.status !== 'passed');

    expect({
      workflowPassed,
      failedSteps,
      architectureGaps: failedSteps.map((step) => `${step.name}: ${step.details ?? step.status}`),
    }).toMatchObject({
      workflowPassed: true,
      failedSteps: [],
      architectureGaps: [],
    });
  });
});
