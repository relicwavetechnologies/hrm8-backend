import type { Prisma } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class Consultant360Repository extends BaseRepository {

  // --- Leads ---
  async createLead(data: any) {
    return this.prisma.lead.create({ data });
  }

  async findLeads(filters: any, limit?: number, offset?: number) {
    return this.prisma.lead.findMany({
      where: filters,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    });
  }

  async findLeadById(id: string) {
    return this.prisma.lead.findUnique({ where: { id } });
  }

  // --- Conversion Requests ---
  async createConversionRequest(data: any) {
    return this.prisma.leadConversionRequest.create({ data });
  }

  async findConversionRequests(filters: any) {
    return this.prisma.leadConversionRequest.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  async findConversionRequestById(id: string) {
    return this.prisma.leadConversionRequest.findUnique({ where: { id } });
  }

  // --- Dashboard ---
  async getDashboardStats(consultantId: string) {
    const [leads, opportunities, commissions, activities, jobAssignments] = await Promise.all([
      this.prisma.lead.findMany({
        where: {
          OR: [
            { assigned_consultant_id: consultantId },
            { created_by: consultantId },
            { referred_by: consultantId }
          ]
        },
        select: { id: true, status: true, company_name: true, email: true, created_at: true }
      }),
      this.prisma.opportunity.findMany({
        where: { sales_agent_id: consultantId },
        select: { id: true, stage: true, amount: true, probability: true }
      }),
      this.prisma.commission.findMany({
        where: { consultant_id: consultantId },
        select: { id: true, status: true, amount: true, type: true, created_at: true }
      }),
      this.prisma.activity.findMany({
        where: { created_by: consultantId },
        orderBy: { created_at: 'desc' },
        take: 10,
        include: {
          company: { select: { id: true, name: true } }
        }
      }),
      this.prisma.consultantJobAssignment.findMany({
        where: { consultant_id: consultantId, status: 'ACTIVE' },
        select: {
          id: true,
          assigned_at: true,
          created_at: true,
          job: {
            select: {
              id: true,
              title: true,
              location: true,
              company: { select: { name: true } },
              status: true,
              created_at: true
            }
          }
        }
      })
    ]);

    return { leads, opportunities, commissions, activities, jobAssignments };
  }

  // --- Commissions ---
  async findCommissions(filters: any) {
    return this.prisma.commission.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  async findCommissionsByIds(ids: string[]) {
    return this.prisma.commission.findMany({
      where: { id: { in: ids } }
    });
  }

  // --- Earnings ---
  async getEarnings(consultantId: string) {
    const commissions = await this.prisma.commission.findMany({
      where: { consultant_id: consultantId },
      select: { amount: true, status: true, created_at: true }
    });

    const totalEarnings = commissions.reduce((sum, c) => sum + (c.amount || 0), 0);
    const confirmedEarnings = commissions
      .filter(c => c.status === 'CONFIRMED')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30DaysEarnings = commissions
      .filter(c => c.created_at >= thirtyDaysAgo && c.status === 'CONFIRMED')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    return { totalEarnings, confirmedEarnings, last30DaysEarnings };
  }

  // --- Withdrawals ---
  async findWithdrawals(filters: any) {
    return this.prisma.commissionWithdrawal.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  async createWithdrawal(data: any) {
    return this.prisma.commissionWithdrawal.create({ data });
  }

  async findWithdrawalById(id: string) {
    return this.prisma.commissionWithdrawal.findUnique({ where: { id } });
  }

  async updateWithdrawal(id: string, data: any) {
    return this.prisma.commissionWithdrawal.update({
      where: { id },
      data
    });
  }

  // --- Stripe ---
  async findConsultant(id: string) {
    return this.prisma.consultant.findUnique({ where: { id } });
  }

  async updateConsultant(id: string, data: any) {
    return this.prisma.consultant.update({
      where: { id },
      data
    });
  }

  // --- Virtual Account ---
  async getOrCreateAccount(ownerId: string) {
    let account = await this.prisma.virtualAccount.findUnique({
      where: {
        owner_type_owner_id: {
          owner_type: 'CONSULTANT',
          owner_id: ownerId
        }
      }
    });

    if (!account) {
      account = await this.prisma.virtualAccount.create({
        data: {
          owner_type: 'CONSULTANT',
          owner_id: ownerId,
          balance: 0,
          status: 'ACTIVE'
        }
      });
    }

    return account;
  }

  async getAccountBalance(ownerId: string) {
    return this.prisma.virtualAccount.findUnique({
      where: {
        owner_type_owner_id: {
          owner_type: 'CONSULTANT',
          owner_id: ownerId
        }
      }
    });
  }
}
