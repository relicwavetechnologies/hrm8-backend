
import { Response, NextFunction } from 'express';
import { RegionalCompanyService } from './regional-company.service';
import { Hrm8AuthenticatedRequest } from '../../types';
import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';

export class RegionalCompanyController {
    private regionalCompanyService: RegionalCompanyService;

    constructor() {
        this.regionalCompanyService = new RegionalCompanyService();
    }

    getById = async (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const companyId = String((req.params as any).id);
            const result = await this.regionalCompanyService.getById(companyId);
            const companyRegionId = result.company?.region_id;
            if (req.assignedRegionIds && req.assignedRegionIds.length > 0 && (!companyRegionId || !req.assignedRegionIds.includes(companyRegionId))) {
                throw new HttpException(403, 'Access denied for company');
            }
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    getCompanyJobs = async (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const companyId = String((req.params as any).id);
            const { page, limit } = req.query as Record<string, string | string[] | undefined>;
            const pageRaw = Array.isArray(page) ? page[0] : page;
            const limitRaw = Array.isArray(limit) ? limit[0] : limit;
            if (req.assignedRegionIds && req.assignedRegionIds.length > 0) {
                const company = await prisma.company.findUnique({
                    where: { id: companyId },
                    select: { region_id: true },
                });
                if (!company?.region_id || !req.assignedRegionIds.includes(company.region_id)) {
                    throw new HttpException(403, 'Access denied for company');
                }
            }
            const result = await this.regionalCompanyService.getCompanyJobs(
                companyId,
                pageRaw ? parseInt(pageRaw) : undefined,
                limitRaw ? parseInt(limitRaw) : undefined
            );
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };
}
