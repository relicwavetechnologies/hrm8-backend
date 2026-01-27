import { Request, Response } from 'express';
import { BaseController } from '../../core/controller';
import { DepartmentsService } from './departments.service';
import { AuthenticatedRequest } from '../../types';

export class DepartmentsController extends BaseController {
    private service: DepartmentsService;

    constructor() {
        super('departments');
        this.service = new DepartmentsService();
    }

    getDepartments = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const departments = await this.service.getDepartments(req.user!.companyId);
            return this.sendSuccess(res, departments);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateDepartment = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // Expecting old name in param or query? Usually ID.
            // Since name IS the ID here, we use the name.
            const oldName = decodeURIComponent(req.params.id as string);
            const updated = await this.service.updateDepartment(req.user!.companyId, oldName, req.body);
            return this.sendSuccess(res, updated, 'Department updated successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deleteDepartment = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const name = decodeURIComponent(req.params.id as string);
            const result = await this.service.deleteDepartment(req.user!.companyId, name);
            return this.sendSuccess(res, result, 'Department deleted successfully');
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
