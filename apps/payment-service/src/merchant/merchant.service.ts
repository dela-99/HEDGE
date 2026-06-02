import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma-client-payment';
import { PrismaClient } from '../../../generated/prisma-client-payment';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

const safeMerchantSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  businesses: {
    select: {
      id: true,
      name: true,
      businessType: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.MerchantSelect;

type SafeMerchant = Prisma.MerchantGetPayload<{ select: typeof safeMerchantSelect }>;

@Injectable()
export class MerchantService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new merchant.
   * A merchant can own multiple businesses.
   */
  async createMerchant(input: CreateMerchantDto): Promise<SafeMerchant> {
    const email = this.normalizeEmail(input.email);

    const existingMerchant = await this.prisma.merchant.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingMerchant) {
      throw new ConflictException('Merchant with this email already exists');
    }

    return this.prisma.merchant.create({
      data: {
        name: input.name,
        email,
        isActive: true,
      },
      select: safeMerchantSelect,
    });
  }

  /**
   * Get a merchant by ID with their associated businesses.
   */
  async getMerchant(merchantId: string): Promise<SafeMerchant> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: safeMerchantSelect,
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return merchant;
  }

  /**
   * Get all active merchants.
   */
  async getAllMerchants(includeInactive: boolean = false): Promise<SafeMerchant[]> {
    return this.prisma.merchant.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: safeMerchantSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update merchant information.
   */
  async updateMerchant(
    merchantId: string,
    input: UpdateMerchantDto,
  ): Promise<SafeMerchant> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // Check if email is being updated and is already taken
    if (input.email) {
      const email = this.normalizeEmail(input.email);
      const existingMerchant = await this.prisma.merchant.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingMerchant && existingMerchant.id !== merchantId) {
        throw new ConflictException('Email is already taken');
      }

      input.email = email;
    }

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.email && { email: input.email }),
      },
      select: safeMerchantSelect,
    });
  }

  /**
   * Deactivate a merchant.
   * This marks the merchant as inactive but doesn't delete records.
   */
  async deactivateMerchant(merchantId: string): Promise<SafeMerchant> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { isActive: false },
      select: safeMerchantSelect,
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
