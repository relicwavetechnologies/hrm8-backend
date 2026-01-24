import type { Prisma, Integration } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class IntegrationRepository extends BaseRepository {
  
  async create(data: Prisma.IntegrationCreateInput): Promise<Integration> {
    return this.prisma.integration.create({ data });
  }

  async update(id: string, data: Prisma.IntegrationUpdateInput): Promise<Integration> {
    return this.prisma.integration.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<Integration | null> {
    return this.prisma.integration.findUnique({
      where: { id },
    });
  }

  async findByCompanyAndType(companyId: string, type: any): Promise<Integration | null> {
    return this.prisma.integration.findFirst({
      where: { company_id: companyId, type },
    });
  }

  async findAllByCompany(companyId: string): Promise<Integration[]> {
    return this.prisma.integration.findMany({
      where: { company_id: companyId },
    });
  }

  async delete(id: string): Promise<Integration> {
    return this.prisma.integration.delete({
      where: { id },
    });
  }
}
