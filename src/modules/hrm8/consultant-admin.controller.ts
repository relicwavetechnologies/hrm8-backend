import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { BaseRepository } from '../../core/repository';
import { AuthenticatedRequest } from '../../types';

class ConsultantAdminRepository extends BaseRepository {
    async getAllConsultants() {
        return this.prisma.consultant.findMany();
    }
}

export class ConsultantAdminController extends BaseController {
    private repo: ConsultantAdminRepository;

    constructor() {
        super('hrm8-consultant-admin');
        this.repo = new ConsultantAdminRepository();
    }

    getAll = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const results = await this.repo.getAllConsultants();
            return this.sendSuccess(res, results);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    // Stub methods for other routes
    create = async (req: AuthenticatedRequest, res: Response) => this.sendSuccess(res, { created: true });
    update = async (req: AuthenticatedRequest, res: Response) => this.sendSuccess(res, { updated: true });
}
