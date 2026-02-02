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

    private mapToFrontend(consultant: any) {
        if (!consultant) return null;

        const mapped = {
            ...consultant,
            id: consultant.id,
            firstName: consultant.first_name,
            lastName: consultant.last_name,
            regionId: consultant.region_id,
            defaultCommissionRate: consultant.default_commission_rate,
            createdAt: consultant.created_at,
            updatedAt: consultant.updated_at,

            // Stats & details
            totalCommissionsPaid: consultant.total_commissions_paid,
            pendingCommissions: consultant.pending_commissions,
            totalRevenue: consultant.total_revenue,
            totalPlacements: consultant.total_placements,
            successRate: consultant.success_rate,
            averageDaysToFill: consultant.average_days_to_fill,
            currentJobs: consultant.current_jobs,
            maxJobs: consultant.max_jobs,
            currentEmployers: consultant.current_employers,
            maxEmployers: consultant.max_employers,
            paymentMethod: consultant.payment_method,
            taxInformation: consultant.tax_information,
            industryExpertise: consultant.industry_expertise,
            resumeUrl: consultant.resume_url,
            stateProvince: consultant.state_province,
            commissionStructure: consultant.commission_structure,
            lastLoginAt: consultant.last_login_at,

            city: consultant.city,
            country: consultant.country,
            phone: consultant.phone,
            photo: consultant.photo,
            role: consultant.role,
            status: consultant.status,
            address: consultant.address,
            availability: consultant.availability,
            languages: consultant.languages
        };

        // Remove snake_case fields and sensitive data
        const keysToDelete = [
            'first_name', 'last_name', 'region_id', 'default_commission_rate',
            'created_at', 'updated_at', 'password_hash', 'total_commissions_paid',
            'pending_commissions', 'total_revenue', 'total_placements', 'success_rate',
            'average_days_to_fill', 'current_jobs', 'max_jobs', 'current_employers',
            'max_employers', 'payment_method', 'tax_information', 'industry_expertise',
            'resume_url', 'state_province', 'commission_structure', 'last_login_at',
            'payout_enabled', 'stripe_account_id', 'stripe_account_status', 'stripe_onboarded_at',
            'current_leads', 'max_leads'
        ];

        keysToDelete.forEach(key => delete mapped[key]);

        return mapped;
    }

    async getAll(filters: any) {
        const { regionId, regionIds, role, status } = filters;
        const where: any = {};
        if (regionId) where.region_id = regionId;
        if (regionIds) where.region_id = { in: regionIds };
        if (role) where.role = role;
        if (status) where.status = status;

        const consultants = await this.staffRepository.findMany({
            where,
            orderBy: { first_name: 'asc' },
        });

        return consultants.map(c => this.mapToFrontend(c));
    }

    async getById(id: string) {
        const consultant = await this.staffRepository.findById(id);
        if (!consultant) {
            throw new HttpException(404, 'Consultant not found');
        }
        return this.mapToFrontend(consultant);
    }

    async create(data: any) {
        // Validation
        const requiredFields = ['email', 'firstName', 'lastName', 'role', 'regionId', 'password'];
        const missingFields = requiredFields.filter(f => !data[f]);
        if (missingFields.length > 0) {
            throw new HttpException(400, `Missing required fields: ${missingFields.join(', ')}`);
        }

        const existing = await this.staffRepository.findByEmail(data.email);
        if (existing) {
            throw new HttpException(409, 'Email already in use');
        }

        const {
            password,
            firstName,
            lastName,
            regionId,
            defaultCommissionRate,
            ...rest
        } = data;

        const passwordHash = await hashPassword(password);

        const created = await this.staffRepository.create({
            ...rest,
            first_name: firstName,
            last_name: lastName,
            region_id: regionId,
            default_commission_rate: defaultCommissionRate,
            password_hash: passwordHash,
            status: 'ACTIVE',
        });

        return this.mapToFrontend(created);
    }

    async update(id: string, data: any) {
        // Prevent password update via this method
        delete data.password;
        delete data.password_hash;

        // Map camelCase to snake_case if present
        const mappedData: any = { ...data };
        if (data.firstName) {
            mappedData.first_name = data.firstName;
            delete mappedData.firstName;
        }
        if (data.lastName) {
            mappedData.last_name = data.lastName;
            delete mappedData.lastName;
        }
        if (data.regionId) {
            mappedData.region_id = data.regionId;
            delete mappedData.regionId;
        }
        if (data.defaultCommissionRate) {
            mappedData.default_commission_rate = data.defaultCommissionRate;
            delete mappedData.defaultCommissionRate;
        }

        const updated = await this.staffRepository.update(id, mappedData);
        return this.mapToFrontend(updated);
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
