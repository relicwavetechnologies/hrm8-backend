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
    return this.repository.findRegionalRevenue({ status: 'PENDING' as any });
  }

  async getRegionalRevenue(regionId: string) {
    const region = await this.repository.findRegion(regionId);
    if (!region) throw new HttpException(404, 'Region not found');

    const revenue = await this.repository.findRegionalRevenue({ region_id: regionId });
    const total = revenue.reduce((sum, r) => sum + Number(r.total_revenue || 0), 0);

    return { region, revenue, total_revenue: total };
  }

  async calculateMonthlyRevenue(regionId: string) {
    const region = await this.repository.findRegion(regionId);
    if (!region) throw new HttpException(404, 'Region not found');

    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const bills = await prisma.bill.findMany({
      where: {
        status: 'PAID',
        paid_at: { gte: start, lt: end },
        region_id: regionId,
      },
      select: { total_amount: true },
    });

    const totalRevenue = bills.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

    const licenseeId = region.licensee_id || null;
    const licensee = licenseeId ? await this.repository.findLicensee(licenseeId) : null;
    const pct = Number(licensee?.revenue_share_percent || 0);
    const licenseeShare = (totalRevenue * pct) / 100;
    const hrm8Share = totalRevenue - licenseeShare;

    return this.repository.createRegionalRevenue({
      region: { connect: { id: regionId } },
      ...(licenseeId ? { licensee: { connect: { id: licenseeId } } } : {}),
      period_start: start,
      period_end: end,
      total_revenue: totalRevenue,
      licensee_share: licenseeShare,
      hrm8_share: hrm8Share,
      status: 'PENDING' as any,
    });
  }

  async processAllRegionsRevenue() {
    const regions = await prisma.region.findMany({ select: { id: true } });
    const results = await Promise.all(regions.map(r => this.calculateMonthlyRevenue(r.id)));

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
      this.repository.findSettlementsByStatus('PAID'),
      this.repository.findSettlementsByStatus('FAILED')
    ]);

    const totalAmount = total.reduce((sum, s) => sum + Number(s.total_revenue || 0), 0);

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

    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const regionIds = licensee.regions.map(r => r.id);
    const bills = await prisma.bill.findMany({
      where: {
        status: 'PAID',
        paid_at: { gte: start, lt: end },
        company: { region_id: { in: regionIds } },
      },
      select: { total_amount: true },
    });
    const totalRevenue = bills.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
    const pct = Number(licensee.revenue_share_percent || 0);
    const licenseeShare = (totalRevenue * pct) / 100;
    const hrm8Share = totalRevenue - licenseeShare;

    return this.repository.createSettlement({
      licensee: { connect: { id: licenseeId } },
      period_start: start,
      period_end: end,
      total_revenue: totalRevenue,
      licensee_share: licenseeShare,
      hrm8_share: hrm8Share,
      status: 'PENDING',
      generated_at: new Date(),
    });
  }

  async generateAllSettlements() {
    const licensees = await this.repository.findAllLicensees();

    const results = await Promise.all(
      licensees.map(licensee =>
        this.generateSettlement(licensee.id)
      )
    );

    const totalAmount = results.reduce((sum, s) => sum + Number(s.total_revenue || 0), 0);

    return {
      generatedSettlements: results.length,
      totalAmount,
      timestamp: new Date()
    };
  }

  async markSettlementPaid(settlementId: string) {
    const settlement = await this.repository.findSettlementById(settlementId);
    if (!settlement) throw new HttpException(404, 'Settlement not found');

    if (settlement.status === 'PAID') {
      throw new HttpException(400, 'Settlement already marked as paid');
    }

    return this.repository.updateSettlement(settlementId, {
      status: 'PAID',
      payment_date: new Date()
    });
  }

  // --- Attribution ---
  async getAttribution(companyId: string) {
    const company = await this.repository.findCompany(companyId);
    if (!company) throw new HttpException(404, 'Company not found');

    return {
      company_id: company.id,
      region_id: company.region_id,
      sales_agent_id: company.sales_agent_id,
      referred_by: company.referred_by,
      attribution_locked: company.attribution_locked,
      attribution_locked_at: company.attribution_locked_at,
      source: company.sales_agent_id ? 'SALES_AGENT' : 'DIRECT',
    };
  }

  async getAttributionHistory(companyId: string) {
    const company = await this.repository.findCompany(companyId);
    if (!company) throw new HttpException(404, 'Company not found');

    return prisma.auditLog.findMany({
      where: { entity_type: 'company_attribution', entity_id: companyId },
      orderBy: { performed_at: 'desc' },
    });
  }

  async lockAttribution(companyId: string) {
    const company = await this.repository.findCompany(companyId);
    if (!company) throw new HttpException(404, 'Company not found');
    const previous = await this.getAttribution(companyId);

    const updated = await this.repository.updateCompany(companyId, {
      attribution_locked: true,
      attribution_locked_at: new Date(),
    });

    await prisma.auditLog.create({
      data: {
        entity_type: 'company_attribution',
        entity_id: companyId,
        action: 'LOCK',
        performed_by: 'SUPER_ADMIN',
        performed_by_email: 'unknown',
        performed_by_role: 'SUPER_ADMIN',
        changes: previous as any,
        description: 'Attribution locked by super admin',
      },
    });

    return updated;
  }

  async overrideAttribution(companyId: string, data: {
    salesAgentId?: string;
    source: string;
    reason: string;
  }) {
    const company = await this.repository.findCompany(companyId);
    if (!company) throw new HttpException(404, 'Company not found');
    const previous = await this.getAttribution(companyId);

    const updated = await this.repository.updateCompany(companyId, {
      ...(data.salesAgentId
        ? { sales_agent: { connect: { id: data.salesAgentId } } }
        : { sales_agent: { disconnect: true } }),
      attribution_locked: false,
    });

    await prisma.auditLog.create({
      data: {
        entity_type: 'company_attribution',
        entity_id: companyId,
        action: 'OVERRIDE',
        performed_by: 'SUPER_ADMIN',
        performed_by_email: 'unknown',
        performed_by_role: 'SUPER_ADMIN',
        changes: { previous, next: data } as any,
        description: data.reason || 'Attribution overridden by super admin',
      },
    });

    return updated;
  }
}
