import { Test, TestingModule } from '@nestjs/testing';
import { MerchantController } from '../merchant.controller';
import { MerchantService } from '../merchant.service';

describe('MerchantController', () => {
  let controller: MerchantController;
  let service: MerchantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantController],
      providers: [
        {
          provide: MerchantService,
          useValue: {
            createMerchant: jest.fn(),
            getMerchant: jest.fn(),
            getAllMerchants: jest.fn(),
            updateMerchant: jest.fn(),
            deactivateMerchant: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MerchantController>(MerchantController);
    service = module.get<MerchantService>(MerchantService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createMerchant', () => {
    it('should call merchantService.createMerchant with correct params', async () => {
      // TODO: Implement test
    });

    it('should return created merchant', async () => {
      // TODO: Implement test
    });
  });

  describe('getAllMerchants', () => {
    it('should call merchantService.getAllMerchants', async () => {
      // TODO: Implement test
    });

    it('should return list of merchants', async () => {
      // TODO: Implement test
    });
  });

  describe('getMerchant', () => {
    it('should call merchantService.getMerchant with correct ID', async () => {
      // TODO: Implement test
    });

    it('should return a merchant', async () => {
      // TODO: Implement test
    });

    it('should validate UUID format of ID parameter', async () => {
      // TODO: Implement test
    });
  });

  describe('updateMerchant', () => {
    it('should call merchantService.updateMerchant with correct params', async () => {
      // TODO: Implement test
    });

    it('should return updated merchant', async () => {
      // TODO: Implement test
    });

    it('should validate UUID format of ID parameter', async () => {
      // TODO: Implement test
    });
  });

  describe('deactivateMerchant', () => {
    it('should call merchantService.deactivateMerchant with correct ID', async () => {
      // TODO: Implement test
    });

    it('should return deactivated merchant', async () => {
      // TODO: Implement test
    });

    it('should validate UUID format of ID parameter', async () => {
      // TODO: Implement test
    });
  });
});
