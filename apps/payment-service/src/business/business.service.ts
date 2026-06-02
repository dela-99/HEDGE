import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '../../../generated/prisma-client-payment';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

const businessSelect = {
  id: true,
  merchantId: true,
  name: true,
  businessType: true,
  registrationNumber: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      members: true,
      linkedAccounts: true,
    },
  },
} satisfies Prisma.BusinessSelect;

type BusinessView = Prisma.BusinessGetPayload<{ select: typeof businessSelect }>;

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaClient) {}

  async createBusiness(input: CreateBusinessDto): Promise<BusinessView> {
    await this.assertMerchantExists(input.merchantId);

    return this.prisma.business.create({
      data: {
        merchantId: input.merchantId,
        name: input.name,
        businessType: input.businessType,
        registrationNumber: input.registrationNumber,
        isActive: true,
      },
      select: businessSelect,
    });
  }

  async listBusinesses(includeInactive = false): Promise<BusinessView[]> {
    return this.prisma.business.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: businessSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBusiness(id: string): Promise<BusinessView> {
    const business = await this.prisma.business.findUnique({
      where: { id },
      select: businessSelect,
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  async updateBusiness(
    id: string,
    input: UpdateBusinessDto,
  ): Promise<BusinessView> {
    await this.getBusiness(id);

    return this.prisma.business.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.businessType !== undefined && {
          businessType: input.businessType,
        }),
        ...(input.registrationNumber !== undefined && {
          registrationNumber: input.registrationNumber,
        }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select: businessSelect,
    });
  }

  async deactivateBusiness(id: string): Promise<BusinessView> {
    await this.getBusiness(id);

    return this.prisma.business.update({
      where: { id },
      data: { isActive: false },
      select: businessSelect,
    });
  }

  private async assertMerchantExists(merchantId: string): Promise<void> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }
  }
}
