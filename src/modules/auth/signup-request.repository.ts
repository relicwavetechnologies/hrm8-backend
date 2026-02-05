import type { Prisma, SignupRequest } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class SignupRequestRepository extends BaseRepository {
  async create(data: Prisma.SignupRequestCreateInput): Promise<SignupRequest> {
    return this.prisma.signupRequest.create({ data });
  }

  async findById(id: string): Promise<SignupRequest | null> {
    return this.prisma.signupRequest.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<SignupRequest | null> {
    return this.prisma.signupRequest.findFirst({
      where: { email },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByCompanyId(companyId: string): Promise<SignupRequest[]> {
    return this.prisma.signupRequest.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }

  async update(id: string, data: Prisma.SignupRequestUpdateInput): Promise<SignupRequest> {
    return this.prisma.signupRequest.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<SignupRequest> {
    return this.prisma.signupRequest.delete({
      where: { id },
    });
  }
}

export const signupRequestRepository = new SignupRequestRepository();
