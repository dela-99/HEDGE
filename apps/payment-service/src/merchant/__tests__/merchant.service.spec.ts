import { Test, TestingModule } from '@nestjs/testing';
import { MerchantService } from '../merchant.service';
import { PrismaClient } from '../../../../generated/prisma-client-payment';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('MerchantService', () => {
  let service: MerchantService;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantService,
        {
          provide: PrismaClient,
          useValue: {
            merchant: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MerchantService>(MerchantService);
    prisma = module.get<PrismaClient>(PrismaClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMerchant', () => {
    it('should create a new merchant successfully', async () => {
      // TODO: Implement test
    });

    it('should throw ConflictException if email already exists', async () => {
      // TODO: Implement test
    });

    it('should normalize email to lowercase', async () => {
      // TODO: Implement test
    });
  });

  describe('getMerchant', () => {
    it('should return a merchant by ID', async () => {
      // TODO: Implement test
    });

    it('should throw NotFoundException if merchant does not exist', async () => {
      // TODO: Implement test
    });

    it('should include associated businesses in response', async () => {
      // TODO: Implement test
    });
  });

  describe('getAllMerchants', () => {
    it('should return all active merchants by default', async () => {
      // TODO: Implement test
    });

    it('should return all merchants when includeInactive is true', async () => {
      // TODO: Implement test
    });

    it('should order merchants by creation date descending', async () => {
      // TODO: Implement test
    });
  });

  describe('updateMerchant', () => {
    it('should update merchant name successfully', async () => {
      // TODO: Implement test
    });

    it('should update merchant email successfully', async () => {
      // TODO: Implement test
    });

    it('should throw NotFoundException if merchant does not exist', async () => {
      // TODO: Implement test
    });

    it('should throw ConflictException if new email is already taken', async () => {
      // TODO: Implement test
    });

    it('should normalize email to lowercase', async () => {
      // TODO: Implement test
    });
  });

  describe('deactivateMerchant', () => {
    it('should deactivate a merchant successfully', async () => {
      // TODO: Implement test
    });

    it('should throw NotFoundException if merchant does not exist', async () => {
      // TODO: Implement test
    });

    it('should set isActive to false', async () => {
      // TODO: Implement test
    });
  });
});
