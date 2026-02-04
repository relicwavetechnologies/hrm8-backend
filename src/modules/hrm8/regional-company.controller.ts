
import { Request, Response, NextFunction } from 'express';
import { RegionalCompanyService } from './regional-company.service';

export class RegionalCompanyController {
    private regionalCompanyService: RegionalCompanyService;

    constructor() {
        this.regionalCompanyService = new RegionalCompanyService();
    }

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.regionalCompanyService.getById(req.params.id);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    getCompanyJobs = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.regionalCompanyService.getCompanyJobs(req.params.id);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };
}
