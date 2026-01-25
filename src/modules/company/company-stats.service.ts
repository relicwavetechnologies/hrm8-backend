import { BaseService } from '../../core/service';
import { startOfMonth } from 'date-fns';
import { prisma } from '../../utils/prisma';

export class CompanyStatsService extends BaseService {
  async getCompanyEmployeeCount(companyId: string): Promise<number> {
    const count = await prisma.user.count({
      where: {
        company_id: companyId,
        status: { in: ['ACTIVE', 'PENDING_VERIFICATION'] }
      }
    });
    return count;
  }

  async getCompanyJobsPostedThisMonth(companyId: string): Promise<number> {
    const monthStart = startOfMonth(new Date());
    const count = await prisma.job.count({
      where: {
        company_id: companyId,
        created_at: {
          gte: monthStart
        }
      }
    });
    return count;
  }

  async getCompanyActiveJobs(companyId: string): Promise<number> {
    const count = await prisma.job.count({
      where: {
        company_id: companyId,
        status: 'OPEN'
      }
    });
    return count;
  }

  async getCompanyApplicationsThisMonth(companyId: string): Promise<number> {
    const monthStart = startOfMonth(new Date());
    const count = await prisma.application.count({
      where: {
        job: {
          company_id: companyId
        },
        created_at: {
          gte: monthStart
        }
      }
    });
    return count;
  }

  async getCompanyWalletBalance(companyId: string): Promise<number> {
    const account = await prisma.virtualAccount.findUnique({
      where: {
        owner_type_owner_id: {
          owner_type: 'COMPANY',
          owner_id: companyId
        }
      }
    });
    return account?.balance || 0;
  }

  async getCompanyActiveSubscriptions(companyId: string): Promise<number> {
    const count = await prisma.subscription.count({
      where: {
        company_id: companyId,
        status: 'ACTIVE'
      }
    });
    return count;
  }

  async getCompanyStats(companyId: string) {
    const startTime = Date.now();

    try {
      const results = await Promise.all([
        this.getCompanyEmployeeCount(companyId),
        this.getCompanyJobsPostedThisMonth(companyId),
        this.getCompanyActiveJobs(companyId),
        this.getCompanyApplicationsThisMonth(companyId),
        this.getCompanyWalletBalance(companyId),
        this.getCompanyActiveSubscriptions(companyId)
      ]);

      const [
        employeeCount, 
        jobsPostedThisMonth, 
        activeJobs, 
        applicationsThisMonth,
        walletBalance,
        activeSubscriptions
      ] = results;
      
      const duration = Date.now() - startTime;

      return {
        employeeCount,
        jobsPostedThisMonth,
        activeJobs,
        applicationsThisMonth,
        walletBalance,
        activeSubscriptions
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('[CompanyStatsService] Failed after', duration, 'ms:', error.message);
      throw error;
    }
  }
}

export const companyStatsService = new CompanyStatsService();
