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

  async findPublicCompanies(params: {
    search?: string;
    limit: number;
    offset: number;
  }): Promise<{ companies: Array<{
    id: string;
    name: string;
    website: string;
    domain: string;
    careers_page_logo: string | null;
    careers_page_banner: string | null;
    careers_page_about: string | null;
    careers_page_social: Prisma.JsonValue | null;
    careers_page_images: Prisma.JsonValue | null;
  }>; total: number }> {
    const where: Prisma.CompanyWhereInput = {
      OR: [
        { careers_page_status: 'APPROVED' },
        {
          jobs: {
            some: {
              status: 'OPEN',
              visibility: 'public',
              archived: false,
              posting_date: { not: null },
              OR: [{ expires_at: null }, { expires_at: { gte: new Date() } }],
            },
          },
        },
      ],
    };

    if (params.search?.trim()) {
      const search = params.search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { domain: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        take: params.limit,
        skip: params.offset,
        select: {
          id: true,
          name: true,
          website: true,
          domain: true,
          careers_page_logo: true,
          careers_page_banner: true,
          careers_page_about: true,
          careers_page_social: true,
          careers_page_images: true,
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { companies, total };
  }

  async findPublicCompanyById(id: string): Promise<{
    id: string;
    name: string;
    website: string;
    domain: string;
    careers_page_logo: string | null;
    careers_page_banner: string | null;
    careers_page_about: string | null;
    careers_page_social: Prisma.JsonValue | null;
    careers_page_images: Prisma.JsonValue | null;
  } | null> {
    return this.prisma.company.findFirst({
      where: {
        id,
        OR: [
          { careers_page_status: 'APPROVED' },
          {
            jobs: {
              some: {
                status: 'OPEN',
                visibility: 'public',
                archived: false,
                posting_date: { not: null },
                OR: [{ expires_at: null }, { expires_at: { gte: new Date() } }],
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        website: true,
        domain: true,
        careers_page_logo: true,
        careers_page_banner: true,
        careers_page_about: true,
        careers_page_social: true,
        careers_page_images: true,
      },
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
        virtual_account: {
          owner_type: 'COMPANY',
          owner_id: companyId
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        virtual_account: {
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
        virtual_account: {
          owner_type: 'COMPANY',
          owner_id: companyId
        }
      },
      select: {
        amount: true,
        type: true,
        direction: true,
        status: true,
        created_at: true
      }
    });

    const totalTransactions = transactions.length;
    const totalDebited = transactions
      .filter(t => t.direction === 'DEBIT' && t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCredited = transactions
      .filter(t => t.direction === 'CREDIT' && t.status === 'COMPLETED')
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
    return this.prisma.transactionRefundRequest.create({ data });
  }

  async findRefundRequests(filters: any, limit?: number, offset?: number) {
    return this.prisma.transactionRefundRequest.findMany({
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
    return this.prisma.transactionRefundRequest.findUnique({
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
    return this.prisma.transactionRefundRequest.update({
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
    return this.prisma.transactionRefundRequest.delete({ where: { id } });
  }
}
