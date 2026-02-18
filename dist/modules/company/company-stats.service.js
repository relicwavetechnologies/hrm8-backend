"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyStatsService = exports.CompanyStatsService = void 0;
const service_1 = require("../../core/service");
const date_fns_1 = require("date-fns");
const prisma_1 = require("../../utils/prisma");
class CompanyStatsService extends service_1.BaseService {
    async getCompanyEmployeeCount(companyId) {
        const count = await prisma_1.prisma.user.count({
            where: {
                company_id: companyId,
                status: { in: ['ACTIVE', 'PENDING_VERIFICATION'] }
            }
        });
        return count;
    }
    async getCompanyJobsPostedThisMonth(companyId) {
        const monthStart = (0, date_fns_1.startOfMonth)(new Date());
        const count = await prisma_1.prisma.job.count({
            where: {
                company_id: companyId,
                created_at: {
                    gte: monthStart
                }
            }
        });
        return count;
    }
    async getCompanyActiveJobs(companyId) {
        const count = await prisma_1.prisma.job.count({
            where: {
                company_id: companyId,
                status: 'OPEN'
            }
        });
        return count;
    }
    async getCompanyApplicationsThisMonth(companyId) {
        const monthStart = (0, date_fns_1.startOfMonth)(new Date());
        const count = await prisma_1.prisma.application.count({
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
    async getCompanyWalletBalance(companyId) {
        const account = await prisma_1.prisma.virtualAccount.findUnique({
            where: {
                owner_type_owner_id: {
                    owner_type: 'COMPANY',
                    owner_id: companyId
                }
            }
        });
        return account?.balance || 0;
    }
    async getCompanyActiveSubscriptions(companyId) {
        const count = await prisma_1.prisma.subscription.count({
            where: {
                company_id: companyId,
                status: 'ACTIVE'
            }
        });
        return count;
    }
    async getCompanyStats(companyId) {
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
            const [employeeCount, jobsPostedThisMonth, activeJobs, applicationsThisMonth, walletBalance, activeSubscriptions] = results;
            const duration = Date.now() - startTime;
            return {
                employeeCount,
                jobsPostedThisMonth,
                activeJobs,
                applicationsThisMonth,
                walletBalance,
                activeSubscriptions
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            console.error('[CompanyStatsService] Failed after', duration, 'ms:', error.message);
            throw error;
        }
    }
}
exports.CompanyStatsService = CompanyStatsService;
exports.companyStatsService = new CompanyStatsService();
