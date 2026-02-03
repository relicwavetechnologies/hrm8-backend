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

  // --- Transactions ---
  async findTransactions(companyId: string, limit?: number, offset?: number) {
    return this.prisma.virtualTransaction.findMany({
      where: {
        account: {
          owner_type: 'COMPANY',
          owner_id: companyId
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        account: {
          select: {
            id: true,
            owner_type: true,
            owner_id: true,
            balance: true
          }
        }
      }
    });
  }

  async getTransactionStats(companyId: string) {
    const transactions = await this.prisma.virtualTransaction.findMany({
      where: {
        account: {
          owner_type: 'COMPANY',
          owner_id: companyId
        }
      },
      select: {
        amount: true,
        type: true,
        status: true,
        created_at: true
      }
    });

    const totalTransactions = transactions.length;
    const totalDebited = transactions
      .filter(t => t.type === 'DEBIT' && t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCredited = transactions
      .filter(t => t.type === 'CREDIT' && t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.amount, 0);
    const pendingAmount = transactions
      .filter(t => t.status === 'PENDING')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalTransactions,
      totalDebited,
      totalCredited,
      pendingAmount,
      netFlow: totalCredited - totalDebited
    };
  }

  // --- Refund Requests ---
  async createRefundRequest(data: any) {
    return this.prisma.refundRequest.create({ data });
  }

  async findRefundRequests(filters: any, limit?: number, offset?: number) {
    return this.prisma.refundRequest.findMany({
      where: filters,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  async findRefundRequestById(id: string) {
    return this.prisma.refundRequest.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  async updateRefundRequest(id: string, data: any) {
    return this.prisma.refundRequest.update({
      where: { id },
      data,
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  async deleteRefundRequest(id: string) {
    return this.prisma.refundRequest.delete({ where: { id } });
  }
}
