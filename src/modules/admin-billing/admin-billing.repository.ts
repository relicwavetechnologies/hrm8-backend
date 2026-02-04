import type { Prisma } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class AdminBillingRepository extends BaseRepository {
  // --- Commissions ---
  async findCommissions(filters?: Prisma.CommissionWhereInput, limit?: number, offset?: number) {
    return this.prisma.commission.findMany({
      where: filters,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        consultant: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });
  }

  async findCommissionsByConsultant(consultantId: string) {
    return this.prisma.commission.findMany({
      where: { consultant_id: consultantId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findCommissionById(id: string) {
    return this.prisma.commission.findUnique({
      where: { id },
      include: {
        consultant: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });
  }

  async updateCommission(id: string, data: Prisma.CommissionUpdateInput) {
    return this.prisma.commission.update({
      where: { id },
      data,
    });
  }

  async updateManyCommissions(ids: string[], data: Prisma.CommissionUpdateManyMutationInput) {
    return this.prisma.commission.updateMany({
      where: { id: { in: ids } },
      data,
    });
  }

  // --- Revenue (RegionalRevenue) ---
  async findRegionalRevenue(where?: Prisma.RegionalRevenueWhereInput) {
    return this.prisma.regionalRevenue.findMany({
      where,
      include: { region: true, licensee: true },
      orderBy: { period_start: 'desc' },
    });
  }

  async createRegionalRevenue(data: Prisma.RegionalRevenueCreateInput) {
    return this.prisma.regionalRevenue.create({ data });
  }

  // --- Settlements ---
  async findSettlements(filters?: Prisma.SettlementWhereInput, limit?: number, offset?: number) {
    return this.prisma.settlement.findMany({
      where: filters,
      orderBy: { generated_at: 'desc' },
      take: limit,
      skip: offset,
      include: { licensee: true },
    });
  }

  async findSettlementById(id: string) {
    return this.prisma.settlement.findUnique({
      where: { id },
      include: { licensee: true },
    });
  }

  async createSettlement(data: Prisma.SettlementCreateInput) {
    return this.prisma.settlement.create({ data });
  }

  async updateSettlement(id: string, data: Prisma.SettlementUpdateInput) {
    return this.prisma.settlement.update({ where: { id }, data });
  }

  async findSettlementsByStatus(status: string) {
    return this.prisma.settlement.findMany({
      where: { status },
      orderBy: { generated_at: 'desc' },
    });
  }

  // --- Region/Company/Licensee ---
  async findRegion(id: string) {
    return this.prisma.region.findUnique({ where: { id } });
  }

  async findCompany(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      include: {
        region: true,
        sales_agent: { select: { id: true, first_name: true, last_name: true, email: true } },
      },
    });
  }

  async updateCompany(id: string, data: Prisma.CompanyUpdateInput) {
    return this.prisma.company.update({ where: { id }, data });
  }

  async findLicensee(id: string) {
    return this.prisma.regionalLicensee.findUnique({
      where: { id },
      include: { regions: true },
    });
  }

  async findAllLicensees() {
    return this.prisma.regionalLicensee.findMany({ include: { regions: true } });
  }
}

