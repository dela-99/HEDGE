import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  BusinessRole,
  Prisma,
  PrismaClient,
} from '../../../generated/prisma-client-payment';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

const businessMemberSelect = {
  id: true,
  businessId: true,
  userId: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BusinessMemberSelect;

type BusinessMemberView = Prisma.BusinessMemberGetPayload<{
  select: typeof businessMemberSelect;
}>;

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaClient) {}

  async inviteMember(input: InviteMemberDto): Promise<BusinessMemberView> {
    await this.assertBusinessExists(input.businessId);

    try {
      return await this.prisma.businessMember.create({
        data: {
          businessId: input.businessId,
          userId: input.userId,
          role: input.role ?? BusinessRole.VIEWER,
        },
        select: businessMemberSelect,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('User is already a member of this business');
      }

      throw error;
    }
  }

  async removeMember(id: string): Promise<BusinessMemberView> {
    const member = await this.getMemberOrThrow(id);

    if (member.role === BusinessRole.OWNER) {
      throw new UnprocessableEntityException('OWNER cannot be removed');
    }

    return this.prisma.businessMember.delete({
      where: { id },
      select: businessMemberSelect,
    });
  }

  async updateRole(
    id: string,
    input: UpdateMemberRoleDto,
  ): Promise<BusinessMemberView> {
    await this.getMemberOrThrow(id);

    return this.prisma.businessMember.update({
      where: { id },
      data: { role: input.role },
      select: businessMemberSelect,
    });
  }

  async listMembers(businessId: string): Promise<BusinessMemberView[]> {
    await this.assertBusinessExists(businessId);

    return this.prisma.businessMember.findMany({
      where: { businessId },
      select: businessMemberSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertBusinessExists(businessId: string): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }
  }

  private async getMemberOrThrow(id: string): Promise<BusinessMemberView> {
    const member = await this.prisma.businessMember.findUnique({
      where: { id },
      select: businessMemberSelect,
    });

    if (!member) {
      throw new NotFoundException('Business member not found');
    }

    return member;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
