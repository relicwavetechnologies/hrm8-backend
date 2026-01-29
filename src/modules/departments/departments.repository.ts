import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../core/repository';
import { Department } from './departments.types';

export class DepartmentsRepository extends BaseRepository {
    /**
     * Get all unique departments for a company from the Job table
     * @param companyId Company ID
     */
    async getDepartments(companyId: string): Promise<Department[]> {
        // Group jobs by department and count them
        const jobsByDepartment = await this.prisma.job.groupBy({
            by: ['department'],
            where: {
                company_id: companyId,
                department: {
                    not: null,
                },
                // We might want to include archived/closed jobs or not, depending on requirements.
                // For now, let's include all to show full history, or maybe filter?
                // Usually settings show everything.
                status: { not: 'DRAFT' } // Exclude drafts from defining "active departments"
            },
            _count: {
                _all: true,
            },
        });

        return jobsByDepartment
            .filter(group => group.department !== null && group.department !== '')
            .map(group => ({
                name: group.department as string,
                count: group._count._all,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Rename a department across all jobs
     * @param companyId Company ID
     * @param oldName Old department name
     * @param newName New department name
     */
    async renameDepartment(companyId: string, oldName: string, newName: string): Promise<number> {
        const result = await this.prisma.job.updateMany({
            where: {
                company_id: companyId,
                department: oldName,
            },
            data: {
                department: newName,
            },
        });

        return result.count;
    }

    /**
     * Delete a department (Set department to null for all jobs with this department)
     * @param companyId Company ID
     * @param name Department name
     */
    async deleteDepartment(companyId: string, name: string): Promise<number> {
        const result = await this.prisma.job.updateMany({
            where: {
                company_id: companyId,
                department: name,
            },
            data: {
                department: null, // Remove the department association
            },
        });

        return result.count;
    }
}
