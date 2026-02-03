import { BaseService } from '../../core/service';
import { AdminBillingRepository } from './admin-billing.repository';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';

export class AdminBillingService extends BaseService {
  constructor(private repository: AdminBillingRepository) {
    super();
  }

  // --- Commissions ---
  async getCommissions(limit?: number, offset?: number) {
    return this.repository.findCommissions({}, limit, offset);
  }

  async getConsultantCommissions(consultantId: string) {
    const commissions = await this.repository.findCommissionsByConsultant(consultantId);
    const total = commissions.length;
    const pending = commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + (c.amount || 0), 0);
    const confirmed = commissions.filter(c => c.status === 'CONFIRMED').reduce((sum, c) => sum + (c.amount || 0), 0);
    const paid = commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + (c.amount || 0), 0);

    return { commissions, stats: { total, pending, confirmed, paid } };
  }

  async payCommission(commissionId: string) {
    const commission = await this.repository.findCommissionById(commissionId);
    if (!commission) throw new HttpException(404, 'Commission not found');

    if (commission.status === 'PAID') {
      throw new HttpException(400, 'Commission already paid');
    }

    return this.repository.updateCommission(commissionId, {
      status: 'PAID',
      paid_at: new Date()
    });
  }

  async bulkPayCommissions(commissionIds: string[]) {
    if (!commissionIds || commissionIds.length === 0) {
      throw new HttpException(400, 'Commission IDs array is required');
    }

    const result = await prisma.$transaction(async (tx) => {
      const commissions = await tx.commission.findMany({
        where: { id: { in: commissionIds } }
      });

      const totalAmount = commissions.reduce((sum, c) => sum + (c.amount || 0), 0);

      await tx.commission.updateMany({
        where: { id: { in: commissionIds } },
        data: { status: 'PAID', paid_at: new Date() }
      });

      return {
        processed: commissionIds.length,
        totalAmount,
        paidAt: new Date()
      };
    });

    return result;
  }

  // --- Revenue ---
  async getPendingRevenue() {
    return this.repository.findRevenue({ status: 'PENDING' });
  }

  async getRegionalRevenue(regionId: string) {
    const region = await this.repository.findRegion(regionId);
    if (!region) throw new HttpException(404, 'Region not found');

    const revenue = await this.repository.findRevenueByRegion(regionId);
    const total = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);

    return { region, revenue, totalPendingRevenue: total };
  }

  async calculateMonthlyRevenue(regionId: string) {
    const region = await this.repository.findRegion(regionId);
    if (!region) throw new HttpException(404, 'Region not found');

    const revenue = await this.repository.findRevenueByRegion(regionId);

    const monthlyRevenue = {
      regionId,
      period: new Date().toISOString().slice(0, 7),
      totalAmount: revenue.reduce((sum, r) => sum + (r.amount || 0), 0),
      transactionCount: revenue.length,
      timestamp: new Date()
    };

    return this.repository.createRevenue(monthlyRevenue);
  }

  async processAllRegionsRevenue() {
    const regions = await this.repository.findAllLicensees();

    const results = await Promise.all(
      regions.map(region =>
        this.calculateMonthlyRevenue(region.region_id)
      )
    );

    return {
      processedRegions: results.length,
      timestamp: new Date()
    };
  }

  // --- Settlements ---
  async getSettlements(limit?: number, offset?: number) {
    return this.repository.findSettlements({}, limit, offset);
  }

  async getSettlementById(settlementId: string) {
    const settlement = await this.repository.findSettlementById(settlementId);
    if (!settlement) throw new HttpException(404, 'Settlement not found');
    return settlement;
  }

  async getSettlementStats() {
    const [total, pending, completed, failed] = await Promise.all([
      this.repository.findSettlements({}),
      this.repository.findSettlementsByStatus('PENDING'),
      this.repository.findSettlementsByStatus('COMPLETED'),
      this.repository.findSettlementsByStatus('FAILED')
    ]);

    const totalAmount = total.reduce((sum, s) => sum + (s.amount || 0), 0);

    return {
      totalSettlements: total.length,
      pendingCount: pending.length,
      completedCount: completed.length,
      failedCount: failed.length,
      totalAmount
    };
  }

  async generateSettlement(licenseeId: string) {
    const licensee = await this.repository.findLicensee(licenseeId);
    if (!licensee) throw new HttpException(404, 'Licensee not found');

    // Calculate settlement amount based on revenue/commission data
    const revenues = await this.repository.findRevenueByRegion(licensee.region_id);
    const settlementAmount = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);

    return this.repository.createSettlement({
      licensee: { connect: { id: licenseeId } },
      amount: settlementAmount,
      currency: 'USD',
      period: new Date().toISOString().slice(0, 7),
      status: 'PENDING',
      generated_at: new Date()
    });
  }

  async generateAllSettlements() {
    const licensees = await this.repository.findAllLicensees();

    const results = await Promise.all(
      licensees.map(licensee =>
        this.generateSettlement(licensee.id)
      )
    );

    const totalAmount = results.reduce((sum, s) => sum + (s.amount || 0), 0);

    return {
      generatedSettlements: results.length,
      totalAmount,
      timestamp: new Date()
    };
  }

  async markSettlementPaid(settlementId: string) {
    const settlement = await this.repository.findSettlementById(settlementId);
    if (!settlement) throw new HttpException(404, 'Settlement not found');

    if (settlement.status === 'COMPLETED') {
      throw new HttpException(400, 'Settlement already marked as paid');
    }

    return this.repository.updateSettlement(settlementId, {
      status: 'COMPLETED',
      paid_at: new Date()
    });
  }

  // --- Attribution ---
  async getAttribution(companyId: string) {
    const company = await this.repository.findCompany(companyId);
    if (!company) throw new HttpException(404, 'Company not found');

    let attribution = await this.repository.findAttribution(companyId);

    if (!attribution) {
      attribution = await this.repository.createAttribution({
        company: { connect: { id: companyId } },
        source: company.sales_agent_id ? 'SALES_AGENT' : 'DIRECT',
        sales_agent_id: company.sales_agent_id,
        region_id: company.region_id,
        status: 'ACTIVE'
      });
    }

    return attribution;
  }

  async getAttributionHistory(companyId: string) {
    const company = await this.repository.findCompany(companyId);
    if (!company) throw new HttpException(404, 'Company not found');

    return this.repository.findAttributionHistory(companyId);
  }

  async lockAttribution(companyId: string) {
    const company = await this.repository.findCompany(companyId);
    if (!company) throw new HttpException(404, 'Company not found');

    const attribution = await this.getAttribution(companyId);

    await this.repository.createAttributionHistory({
      company: { connect: { id: companyId } },
      previous_source: attribution.source,
      new_source: attribution.source,
      reason: 'LOCKED_BY_ADMIN',
      changed_by: 'ADMIN',
      changed_at: new Date()
    });

    return this.repository.updateAttribution(companyId, {
      status: 'LOCKED'
    });
  }

  async overrideAttribution(companyId: string, data: {
    salesAgentId?: string;
    source: string;
    reason: string;
  }) {
    const company = await this.repository.findCompany(companyId);
    if (!company) throw new HttpException(404, 'Company not found');

    const attribution = await this.getAttribution(companyId);

    await this.repository.createAttributionHistory({
      company: { connect: { id: companyId } },
      previous_source: attribution.source,
      new_source: data.source,
      reason: data.reason,
      changed_by: 'ADMIN',
      changed_at: new Date()
    });

    return this.repository.updateAttribution(companyId, {
      source: data.source,
      sales_agent_id: data.salesAgentId,
      status: 'OVERRIDDEN'
    });
  }
}
