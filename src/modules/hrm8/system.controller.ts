import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { BaseRepository } from '../../core/repository';
import { AuthenticatedRequest } from '../../types';

class SystemRepository extends BaseRepository {
    async getSettings() {
        // Mock
        return { maintenanceMode: false, version: '2.0' };
    }
}

export class SystemController extends BaseController {
    private repo: SystemRepository;

    constructor() {
        super('hrm8-system');
        this.repo = new SystemRepository();
    }

    getSettings = async (req: AuthenticatedRequest, res: Response) => {
        const settings = await this.repo.getSettings();
        return this.sendSuccess(res, settings);
    }

    updateSettings = async (req: AuthenticatedRequest, res: Response) => {
        return this.sendSuccess(res, { updated: true });
    }
}
