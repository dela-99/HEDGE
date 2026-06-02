import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  LinkedAccountStatus,
  PaymentProvider,
  Prisma,
  PrismaClient,
} from '../../../generated/prisma-client-payment';
import { CreateLinkedAccountDto } from './dto/create-linked-account.dto';
import { UpdateLinkedAccountDto } from './dto/update-linked-account.dto';

const linkedAccountSelect = {
  id: true,
  merchantId: true,
  businessId: true,
  provider: true,
  providerAccountId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LinkedAccountSelect;

type LinkedAccountView = Prisma.LinkedAccountGetPayload<{
  select: typeof linkedAccountSelect;
}>;

@Injectable()
export class LinkedAccountsService {
  constructor(private prisma: PrismaClient) {}

  async createLinkedAccount(
    input: CreateLinkedAccountDto,
  ): Promise<LinkedAccountView> {
    await this.assertBusinessBelongsToMerchant(input.merchantId, input.businessId);

    try {
      return await this.prisma.linkedAccount.create({
        data: {
          merchantId: input.merchantId,
          businessId: input.businessId,
          provider: input.provider,
          providerAccountId: input.providerAccountId.trim(),
          status: input.status ?? LinkedAccountStatus.PENDING,
        },
        select: linkedAccountSelect,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Provider account is already linked');
      }

      throw error;
    }
  }

  async getLinkedAccount(id: string): Promise<LinkedAccountView> {
    const linkedAccount = await this.prisma.linkedAccount.findUnique({
      where: { id },
      select: linkedAccountSelect,
    });

    if (!linkedAccount) {
      throw new NotFoundException('Linked account not found');
    }

    return linkedAccount;
  }

  async listLinkedAccounts(filters: {
    merchantId?: string;
    businessId?: string;
    provider?: PaymentProvider;
    status?: LinkedAccountStatus;
  }): Promise<LinkedAccountView[]> {
    return this.prisma.linkedAccount.findMany({
      where: {
        ...(filters.merchantId && { merchantId: filters.merchantId }),
        ...(filters.businessId && { businessId: filters.businessId }),
        ...(filters.provider && { provider: filters.provider }),
        ...(filters.status && { status: filters.status }),
      },
      select: linkedAccountSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateLinkedAccount(
    id: string,
    input: UpdateLinkedAccountDto,
  ): Promise<LinkedAccountView> {
    await this.getLinkedAccount(id);

    return this.prisma.linkedAccount.update({
      where: { id },
      data: {
        ...(input.status && { status: input.status }),
      },
      select: linkedAccountSelect,
    });
  }

  async deleteLinkedAccount(id: string): Promise<LinkedAccountView> {
    await this.getLinkedAccount(id);

    return this.prisma.linkedAccount.delete({
      where: { id },
      select: linkedAccountSelect,
    });
  }

  private async assertBusinessBelongsToMerchant(
    merchantId: string,
    businessId: string,
  ): Promise<void> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { merchantId: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (business.merchantId !== merchantId) {
      throw new UnprocessableEntityException(
        'Business does not belong to merchant',
      );
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
