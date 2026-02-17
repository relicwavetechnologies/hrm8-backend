"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionalCompanyService = void 0;
const service_1 = require("../../core/service");
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
class RegionalCompanyService extends service_1.BaseService {
    async getById(id) {
        const company = await prisma_1.prisma.company.findUnique({
            where: { id },
            include: {
                subscription: true,
                region: true
            }
        });
        if (!company)
            throw new http_exception_1.HttpException(404, 'Company not found');
        return { company };
    }
    async getCompanyJobs(companyId) {
        // defined in Hrm8CompanyJobsPage as CompanyJob[]
        const jobs = await prisma_1.prisma.job.findMany({
            where: { company_id: companyId },
            include: {
                _count: {
                    select: {
                        applications: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        return {
            jobs: jobs.map(job => ({
                id: job.id,
                title: job.title,
                status: job.status,
                type: job.employment_type,
                location: job.location,
                salaryMin: job.salary_min,
                salaryMax: job.salary_max,
                postedAt: job.posted_at || job.created_at,
                applicants: job._count.applications,
                views: job.views_count || 0,
                clicks: job.clicks_count || 0,
                createdAt: job.created_at
            }))
        };
    }
}
exports.RegionalCompanyService = RegionalCompanyService;
