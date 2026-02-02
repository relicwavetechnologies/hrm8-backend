
import { BaseService } from '../../core/service';
import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';

export class RegionalCompanyService extends BaseService {
    async getById(id: string) {
        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                subscription: true,
                region: true
            }
        });
        if (!company) throw new HttpException(404, 'Company not found');
        return { company };
    }

    async getCompanyJobs(companyId: string) {
        // defined in Hrm8CompanyJobsPage as CompanyJob[]
        const jobs = await prisma.job.findMany({
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
