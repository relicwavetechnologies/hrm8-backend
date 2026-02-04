
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

    async getCompanyJobs(companyId: string, page: number = 1, limit: number = 10) {
        const pageSafe = page && page > 0 ? page : 1;
        const limitSafe = limit && limit > 0 ? limit : 10;
        const skip = (pageSafe - 1) * limitSafe;

        const [jobs, total] = await Promise.all([
            prisma.job.findMany({
                where: { company_id: companyId },
                include: {
                    _count: {
                        select: {
                            applications: true
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limitSafe,
            }),
            prisma.job.count({ where: { company_id: companyId } }),
        ]);

        return {
            jobs: jobs.map(job => ({
                id: job.id,
                title: job.title,
                status: job.hrm8_status || job.status,
                location: job.location,
                posted_at: job.posted_at || job.created_at,
                applicants: job._count.applications,
                views: job.views_count || 0,
                clicks: job.clicks_count || 0,
            })),
            total,
            page: pageSafe,
            page_size: limitSafe,
        };
    }
}
