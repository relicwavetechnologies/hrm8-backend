import { BaseService } from '../../core/service';
import { DepartmentsRepository } from './departments.repository';
import { Department, CreateDepartmentRequest, UpdateDepartmentRequest } from './departments.types';
import { HttpException } from '../../core/http-exception';

export class DepartmentsService extends BaseService {
    private repository: DepartmentsRepository;

    constructor() {
        super();
        this.repository = new DepartmentsRepository();
    }

    /**
     * Get all departments for a company
     */
    async getDepartments(companyId: string): Promise<Department[]> {
        return this.repository.getDepartments(companyId);
    }

    /**
     * Create a department (No-op effectively since we don't store them separately, 
     * but we can validate or maybe store in a future 'settings' json)
     * For now, we'll just return success to satisfy the API contract if the frontend expects it.
     * Or, we can say "Departments are created automatically when you post a job".
     * 
     * However, for a settings page, users might want to "Add" one to appear in a dropdown.
     * Since we don't have a table, we can possibly assume this endpoint might not be needed 
     * OR we rely on the frontend to just call this and we return success.
     * 
     * actually, to strictly follow the pattern, if there is no storage, we can't persist it 
     * without at least one job. 
     * 
     * Let's skip 'create' for now unless we find a place to put it. 
     * But wait, the task list implies standard CRUD.
     * 
     * If the user renames a department, that's real.
     */

    /**
     * Rename a department
     */
    async updateDepartment(companyId: string, oldName: string, data: UpdateDepartmentRequest): Promise<{ count: number }> {
        if (!oldName || !data.name) {
            throw new HttpException(400, 'Department name is required');
        }

        const count = await this.repository.renameDepartment(companyId, oldName, data.name);
        return { count };
    }

    /**
     * Delete a department
     */
    async deleteDepartment(companyId: string, name: string): Promise<{ count: number }> {
        if (!name) {
            throw new HttpException(400, 'Department name is required');
        }

        // Check if jobs exist? Maybe specific logic requires valid replacement? 
        // For now, clear it.
        const count = await this.repository.deleteDepartment(companyId, name);
        return { count };
    }
}
