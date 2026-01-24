import type { Prisma, Company, CompanyProfile } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class CompanyRepository extends BaseRepository {
  // --- Company ---
  
  async create(data: Prisma.CompanyCreateInput): Promise<Company> {
    return this.prisma.company.create({ data });
  }

  async update(id: string, data: Prisma.CompanyUpdateInput): Promise<Company> {
    return this.prisma.company.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<Company | null> {
    return this.prisma.company.findUnique({
      where: { id },
    });
  }

  async findByDomain(domain: string): Promise<Company | null> {
    return this.prisma.company.findUnique({
      where: { domain },
    });
  }

  async findAll(limit: number = 100, offset: number = 0): Promise<Company[]> {
    return this.prisma.company.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async delete(id: string): Promise<Company> {
    return this.prisma.company.delete({
      where: { id },
    });
  }

  async countByDomain(domain: string): Promise<number> {
    return this.prisma.company.count({
      where: { domain },
    });
  }

  // --- Company Profile ---

  async createProfile(data: Prisma.CompanyProfileCreateInput): Promise<CompanyProfile> {
    return this.prisma.companyProfile.create({ data });
  }

  async updateProfile(companyId: string, data: Prisma.CompanyProfileUpdateInput): Promise<CompanyProfile> {
    return this.prisma.companyProfile.update({
      where: { company_id: companyId },
      data,
    });
  }

  async findProfileByCompanyId(companyId: string): Promise<CompanyProfile | null> {
    return this.prisma.companyProfile.findUnique({
      where: { company_id: companyId },
    });
  }

  async upsertProfile(
    companyId: string, 
    createData: Prisma.CompanyProfileCreateInput, 
    updateData: Prisma.CompanyProfileUpdateInput
  ): Promise<CompanyProfile> {
    return this.prisma.companyProfile.upsert({
      where: { company_id: companyId },
      create: createData,
      update: updateData,
    });
  }
}
