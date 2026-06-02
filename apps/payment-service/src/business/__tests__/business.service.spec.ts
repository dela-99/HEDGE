import { NotFoundException } from '@nestjs/common';
import { BusinessService } from '../business.service';

class InMemoryBusinessPrisma {
  merchants = [{ id: '11111111-1111-4111-8111-111111111111' }];
  businesses: any[] = [];

  merchant = {
    findUnique: jest.fn(async ({ where }: any) => {
      return this.merchants.find((merchant) => merchant.id === where.id) ?? null;
    }),
  };

  business = {
    create: jest.fn(async ({ data }: any) => {
      const now = new Date();
      const business = {
        id: `22222222-2222-4222-8222-00000000000${this.businesses.length + 1}`,
        ...data,
        createdAt: now,
        updatedAt: now,
        _count: { members: 0, linkedAccounts: 0 },
      };
      this.businesses.push(business);
      return business;
    }),
    findMany: jest.fn(async ({ where }: any) => {
      return this.businesses.filter(
        (business) => !where?.isActive || business.isActive === where.isActive,
      );
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      return this.businesses.find((business) => business.id === where.id) ?? null;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const business = this.businesses.find((candidate) => candidate.id === where.id);
      if (!business) {
        throw new Error('Business not found');
      }

      Object.assign(business, data, { updatedAt: new Date() });
      return business;
    }),
  };
}

describe('BusinessService integration', () => {
  let prisma: InMemoryBusinessPrisma;
  let service: BusinessService;

  beforeEach(() => {
    prisma = new InMemoryBusinessPrisma();
    service = new BusinessService(prisma as any);
  });

  it('creates a business that belongs to a merchant', async () => {
    const business = await service.createBusiness({
      merchantId: prisma.merchants[0].id,
      name: 'Owner Trading',
      businessType: 'retail',
      registrationNumber: 'SME-001',
    });

    expect(business.merchantId).toBe(prisma.merchants[0].id);
    expect(business.isActive).toBe(true);
  });

  it('rejects creation for a missing merchant', async () => {
    await expect(
      service.createBusiness({
        merchantId: '33333333-3333-4333-8333-333333333333',
        name: 'Missing Merchant Business',
        businessType: 'retail',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('lists only active businesses by default', async () => {
    const active = await service.createBusiness({
      merchantId: prisma.merchants[0].id,
      name: 'Active Business',
      businessType: 'retail',
    });
    const inactive = await service.createBusiness({
      merchantId: prisma.merchants[0].id,
      name: 'Inactive Business',
      businessType: 'retail',
    });
    await service.deactivateBusiness(inactive.id);

    const businesses = await service.listBusinesses();

    expect(businesses).toEqual([active]);
  });

  it('updates business profile fields', async () => {
    const business = await service.createBusiness({
      merchantId: prisma.merchants[0].id,
      name: 'Original',
      businessType: 'retail',
    });

    const updated = await service.updateBusiness(business.id, {
      name: 'Updated',
      businessType: 'services',
    });

    expect(updated.name).toBe('Updated');
    expect(updated.businessType).toBe('services');
  });

  it('deactivates instead of deleting the business root', async () => {
    const business = await service.createBusiness({
      merchantId: prisma.merchants[0].id,
      name: 'Owner Trading',
      businessType: 'retail',
    });

    const deactivated = await service.deactivateBusiness(business.id);

    expect(deactivated.isActive).toBe(false);
  });
});
