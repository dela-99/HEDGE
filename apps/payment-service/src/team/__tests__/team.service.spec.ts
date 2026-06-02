import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '../../../../generated/prisma-client-payment';
import { TeamService } from '../team.service';

describe('TeamService', () => {
  let service: TeamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        {
          provide: PrismaClient,
          useValue: {
            business: {
              findUnique: jest.fn(),
            },
            businessMember: {
              create: jest.fn(),
              delete: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('inviteMember', () => {
    it('should create a business membership', async () => {
      // TODO: Implement test.
    });

    it('should prevent duplicate membership for a business and user', async () => {
      // TODO: Implement test.
    });
  });

  describe('removeMember', () => {
    it('should remove a non-owner business member', async () => {
      // TODO: Implement test.
    });

    it('should prevent removing an OWNER', async () => {
      // TODO: Implement test.
    });
  });

  describe('updateRole', () => {
    it('should update a business member role', async () => {
      // TODO: Implement test.
    });
  });

  describe('listMembers', () => {
    it('should list members for a business', async () => {
      // TODO: Implement test.
    });
  });
});
