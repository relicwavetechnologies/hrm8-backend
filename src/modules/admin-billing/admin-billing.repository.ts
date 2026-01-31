import type { Prisma } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class AdminBillingRepository extends BaseRepository {

  // --- Commissions ---
  async findCommissions(filters?: any, limit?: number, offset?: number) {
    return this.prisma.commission.findMany({
      where: filters,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        consultant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async findCommissionsByConsultant(consultantId: string) {
    return this.prisma.commission.findMany({
      where: { consultant_id: consultantId },
      orderBy: { created_at: 'desc' }
    });
  }

  async findCommissionById(id: string) {
    return this.prisma.commission.findUnique({
      where: { id },
      include: {
        consultant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async updateCommission(id: string, data: any) {
    return this.prisma.commission.update({
      where: { id },
      data,
      include: {
        consultant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async updateManyCommissions(ids: string[], data: any) {
    return this.prisma.commission.updateMany({
      where: { id: { in: ids } },
      data
    });
  }

  // --- Revenue ---
  async findRevenue(filters?: any) {
    return this.prisma.revenueEntry.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  async createRevenue(data: any) {
    return this.prisma.revenueEntry.create({ data });
  }

  async findRevenueByRegion(regionId: string) {
    return this.prisma.revenueEntry.findMany({
      where: {
        region_id: regionId,
        status: 'PENDING'
      }
    });
  }

  // --- Settlements ---
  async findSettlements(filters?: any, limit?: number, offset?: number) {
    return this.prisma.settlement.findMany({
      where: filters,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        licensee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async findSettlementById(id: string) {
    return this.prisma.settlement.findUnique({
      where: { id },
      include: {
        licensee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async createSettlement(data: any) {
    return this.prisma.settlement.create({
      data,
      include: {
        licensee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async updateSettlement(id: string, data: any) {
    return this.prisma.settlement.update({
      where: { id },
      data,
      include: {
        licensee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async findSettlementsByStatus(status: string) {
    return this.prisma.settlement.findMany({
      where: { status },
      orderBy: { created_at: 'desc' }
    });
  }

  // --- Attribution ---
  async findAttribution(companyId: string) {
    return this.prisma.attribution.findUnique({
      where: { company_id: companyId }
    });
  }

  async createAttribution(data: any) {
    return this.prisma.attribution.create({ data });
  }

  async updateAttribution(companyId: string, data: any) {
    return this.prisma.attribution.update({
      where: { company_id: companyId },
      data
    });
  }

  async findAttributionHistory(companyId: string) {
    return this.prisma.attributionHistory.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' }
    });
  }

  async createAttributionHistory(data: any) {
    return this.prisma.attributionHistory.create({ data });
  }

  // --- Region ---
  async findRegion(id: string) {
    return this.prisma.region.findUnique({ where: { id } });
  }

  // --- Company ---
  async findCompany(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      include: {
        region: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  // --- Licensee ---
  async findLicensee(id: string) {
    return this.prisma.regionalLicensee.findUnique({
      where: { id }
    });
  }

  async findAllLicensees() {
    return this.prisma.regionalLicensee.findMany();
  }
}
