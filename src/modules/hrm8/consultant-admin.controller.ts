import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AuthenticatedRequest } from '../../types';
import { ConsultantAdminRepository } from './consultant-admin.repository';
import { hashPassword } from '../../utils/password';
import { HttpException } from '../../core/http-exception';

export class ConsultantAdminController extends BaseController {
    private repo: ConsultantAdminRepository;

    constructor() {
        super('hrm8-consultant-admin');
        this.repo = new ConsultantAdminRepository();
    }

    getAll = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const results = await this.repo.findAll(req.query);
            return this.sendSuccess(res, results);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    getById = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const consultant = await this.repo.findById(req.params.id as string);
            if (!consultant) throw new HttpException(404, 'Consultant not found');
            return this.sendSuccess(res, consultant);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    create = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const data = req.body;
            // Hash password if provided
            if (data.password) {
                data.password_hash = await hashPassword(data.password);
                delete data.password;
            }
            const result = await this.repo.create(data);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    update = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const data = req.body;
            if (data.password) {
                data.password_hash = await hashPassword(data.password);
                delete data.password;
            }
            // Prevent updating critical fields via generic update if needed
            delete data.id;

            const result = await this.repo.update(req.params.id as string, data);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    delete = async (req: AuthenticatedRequest, res: Response) => {
        try {
            await this.repo.delete(req.params.id as string);
            return this.sendSuccess(res, { deleted: true });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    // --- Actions ---

    suspend = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.repo.updateStatus(req.params.id as string, 'SUSPENDED');
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    reactivate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.repo.updateStatus(req.params.id as string, 'ACTIVE');
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    terminate = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // Logic: Terminate and maybe unassign all jobs?
            // For now just status update
            const result = await this.repo.updateStatus(req.params.id as string, 'INACTIVE'); // or TERMINATED if enum exists
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    assignRegion = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { regionId } = req.body;
            const result = await this.repo.assignRegion(req.params.id as string, regionId);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    reassignJobs = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { newConsultantId, jobIds } = req.body;
            const result = await this.repo.reassignJobs(
                req.params.id as string,
                newConsultantId,
                jobIds
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    changeRole = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { role } = req.body;
            const result = await this.repo.updateRole(req.params.id as string, role);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    generateEmail = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // Logic to generate official email (e.g. name@company.com)
            // Mock for now or simple heuristic
            const consultant = await this.repo.findById(req.body.id || req.params.id);
            if (!consultant) throw new HttpException(404, 'Consultant not found');

            const email = `${consultant.first_name}.${consultant.last_name}@hrm8.io`.toLowerCase();
            return this.sendSuccess(res, { email });
        } catch (error) {
            return this.sendError(res, error);
        }
    }
}
