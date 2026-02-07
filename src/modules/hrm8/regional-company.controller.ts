
import { Request, Response, NextFunction } from 'express';
import { RegionalCompanyService } from './regional-company.service';

export class RegionalCompanyController {
    private regionalCompanyService: RegionalCompanyService;

    constructor() {
        this.regionalCompanyService = new RegionalCompanyService();
    }
    private getParam(value: string | string[] | undefined): string {
        if (Array.isArray(value)) return value[0];
        return value || '';
    }

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = this.getParam(req.params.id);
            const result = await this.regionalCompanyService.getById(id);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    getCompanyJobs = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = this.getParam(req.params.id);
            const result = await this.regionalCompanyService.getCompanyJobs(id);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };
}
