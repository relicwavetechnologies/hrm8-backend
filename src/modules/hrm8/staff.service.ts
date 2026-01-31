import { BaseService } from '../../core/service';
import { StaffRepository } from './staff.repository';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';
import { ConsultantRole, ConsultantStatus } from '@prisma/client';
import { hashPassword } from '../../utils/password';

export class StaffService extends BaseService {
    constructor(private staffRepository: StaffRepository) {
        super();
    }

    async getAll(filters: any) {
        const { regionId, regionIds, role, status } = filters;
        const where: any = {};
        if (regionId) where.region_id = regionId;
        if (regionIds) where.region_id = { in: regionIds };
        if (role) where.role = role;
        if (status) where.status = status;

        return this.staffRepository.findMany({
            where,
            orderBy: { first_name: 'asc' },
        });
    }

    async getById(id: string) {
        const consultant = await this.staffRepository.findById(id);
        if (!consultant) {
            throw new HttpException(404, 'Consultant not found');
        }
        return consultant;
    }

    async create(data: any) {
        const existing = await this.staffRepository.findByEmail(data.email);
        if (existing) {
            throw new HttpException(409, 'Email already in use');
        }

        const { password, ...rest } = data;
        const passwordHash = await hashPassword(password);

        return this.staffRepository.create({
            ...rest,
            password_hash: passwordHash,
            status: 'ACTIVE',
        });
    }

    async update(id: string, data: any) {
        // Prevent password update via this method
        delete data.password;
        delete data.password_hash;

        return this.staffRepository.update(id, data);
    }

    async suspend(id: string) {
        return this.staffRepository.update(id, { status: 'SUSPENDED' });
    }

    async reactivate(id: string) {
        return this.staffRepository.update(id, { status: 'ACTIVE' });
    }

    async delete(id: string) {
        // Check if consultant has active assignments
        const activeAssignments = await prisma.consultantJobAssignment.count({
            where: { consultant_id: id, status: 'ACTIVE' }
        });

        if (activeAssignments > 0) {
            throw new HttpException(400, `Cannot delete consultant with ${activeAssignments} active job assignments. Reassign them first.`);
        }

        return this.staffRepository.delete(id);
    }

    async assignRegion(id: string, regionId: string) {
        return this.staffRepository.update(id, { region: { connect: { id: regionId } } });
    }

    async generateEmail(firstName: string, lastName: string, consultantId?: string) {
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@hrm8.email`;
        // In real app, we would check for uniqueness and add suffix if needed
        return { email };
    }

    async getPendingTasks(id: string) {
        const activeAssignments = await prisma.consultantJobAssignment.findMany({
            where: { consultant_id: id, status: 'ACTIVE' },
            include: { job: true }
        });

        return {
            assignments: activeAssignments,
            count: activeAssignments.length
        };
    }

    async getConsultantsForReassignment(id: string, role: ConsultantRole, regionId: string) {
        return this.staffRepository.findMany({
            where: {
                id: { not: id },
                role,
                region_id: regionId,
                status: 'ACTIVE'
            }
        });
    }

    async reassignJobs(id: string, targetConsultantId: string) {
        return prisma.$transaction(async (tx) => {
            const assignments = await tx.consultantJobAssignment.findMany({
                where: { consultant_id: id, status: 'ACTIVE' }
            });

            for (const assignment of assignments) {
                await tx.consultantJobAssignment.update({
                    where: { id: assignment.id },
                    data: { status: 'INACTIVE', pipeline_stage: 'CLOSED' }
                });

                await tx.consultantJobAssignment.create({
                    data: {
                        consultant_id: targetConsultantId,
                        job_id: assignment.job_id,
                        assigned_by: 'system_reassignment',
                        status: 'ACTIVE',
                        pipeline_stage: 'SOURCING',
                        pipeline_progress: 0
                    }
                });
            }

            // Update counts
            await tx.consultant.update({
                where: { id },
                data: { current_jobs: { decrement: assignments.length } }
            });

            await tx.consultant.update({
                where: { id: targetConsultantId },
                data: { current_jobs: { increment: assignments.length } }
            });

            return { count: assignments.length };
        });
    }

    async changeRoleWithTaskHandling(id: string, role: ConsultantRole, taskAction: string, targetConsultantId?: string) {
        const pending = await this.getPendingTasks(id);
        let taskResult = null;

        if (pending.count > 0) {
            if (taskAction === 'REASSIGN' && targetConsultantId) {
                taskResult = await this.reassignJobs(id, targetConsultantId);
            } else if (taskAction === 'TERMINATE') {
                await prisma.consultantJobAssignment.updateMany({
                    where: { consultant_id: id, status: 'ACTIVE' },
                    data: { status: 'INACTIVE', pipeline_stage: 'CLOSED' }
                });
                await prisma.consultant.update({
                    where: { id },
                    data: { current_jobs: 0 }
                });
                taskResult = { terminated: pending.count };
            }
        }

        const updated = await this.staffRepository.update(id, { role });

        return { success: true, consultant: updated, taskResult };
    }
}
