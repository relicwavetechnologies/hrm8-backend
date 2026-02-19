"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffService = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
const prisma_1 = require("../../utils/prisma");
const password_1 = require("../../utils/password");
class StaffService extends service_1.BaseService {
    constructor(staffRepository) {
        super();
        this.staffRepository = staffRepository;
    }
    mapToFrontend(consultant) {
        if (!consultant)
            return null;
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
    async getAll(filters) {
        const { regionId, regionIds, role, status } = filters;
        const where = {};
        if (regionId)
            where.region_id = regionId;
        if (regionIds)
            where.region_id = { in: regionIds };
        if (role)
            where.role = role;
        if (status)
            where.status = status;
        const consultants = await this.staffRepository.findMany({
            where,
            orderBy: { first_name: 'asc' },
        });
        return consultants.map(c => this.mapToFrontend(c));
    }
    async getOverview(filters) {
        const where = {};
        if (filters.regionId) {
            where.region_id = filters.regionId;
        }
        else if (filters.regionIds && filters.regionIds.length > 0) {
            where.region_id = { in: filters.regionIds };
        }
        const consultants = await this.staffRepository.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });
        const totalStaff = consultants.length;
        const activeStaff = consultants.filter((c) => c.status === 'ACTIVE').length;
        const suspendedStaff = consultants.filter((c) => c.status === 'SUSPENDED').length;
        const onLeaveStaff = consultants.filter((c) => c.status === 'ON_LEAVE').length;
        const inactiveStaff = consultants.filter((c) => c.status === 'INACTIVE').length;
        const totalRevenue = consultants.reduce((sum, c) => sum + Number(c.total_revenue || 0), 0);
        const totalPlacements = consultants.reduce((sum, c) => sum + Number(c.total_placements || 0), 0);
        const avgSuccessRate = totalStaff > 0
            ? consultants.reduce((sum, c) => sum + Number(c.success_rate || 0), 0) / totalStaff
            : 0;
        const avgUtilization = totalStaff > 0
            ? consultants.reduce((sum, c) => {
                const maxJobs = Number(c.max_jobs || 10) || 10;
                const currentJobs = Number(c.current_jobs || 0);
                return sum + Math.min((currentJobs / maxJobs) * 100, 200);
            }, 0) / totalStaff
            : 0;
        const roles = ['RECRUITER', 'SALES_AGENT', 'CONSULTANT_360'];
        const roleDistribution = roles.map((role) => ({
            role,
            count: consultants.filter((c) => c.role === role).length,
        }));
        const statuses = ['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'SUSPENDED'];
        const statusDistribution = statuses.map((status) => ({
            status,
            count: consultants.filter((c) => c.status === status).length,
        }));
        const capacityDistribution = {
            under_utilized: 0,
            optimal: 0,
            near_capacity: 0,
            over_capacity: 0,
        };
        consultants.forEach((c) => {
            const maxJobs = Number(c.max_jobs || 10) || 10;
            const currentJobs = Number(c.current_jobs || 0);
            const utilization = (currentJobs / maxJobs) * 100;
            if (utilization < 50)
                capacityDistribution.under_utilized += 1;
            else if (utilization < 80)
                capacityDistribution.optimal += 1;
            else if (utilization <= 100)
                capacityDistribution.near_capacity += 1;
            else
                capacityDistribution.over_capacity += 1;
        });
        const topPerformers = consultants
            .map((c) => ({
            id: c.id,
            name: `${c.first_name} ${c.last_name}`.trim(),
            role: c.role,
            total_revenue: Number(c.total_revenue || 0),
            total_placements: Number(c.total_placements || 0),
            success_rate: Number(c.success_rate || 0),
        }))
            .sort((a, b) => b.total_revenue - a.total_revenue)
            .slice(0, 5);
        const workloadAlerts = consultants
            .map((c) => {
            const maxJobs = Number(c.max_jobs || 10) || 10;
            const currentJobs = Number(c.current_jobs || 0);
            return {
                id: c.id,
                name: `${c.first_name} ${c.last_name}`.trim(),
                role: c.role,
                status: c.status,
                current_jobs: currentJobs,
                max_jobs: maxJobs,
                utilization_percent: Math.round((currentJobs / maxJobs) * 100),
            };
        })
            .filter((c) => c.utilization_percent >= 80 || c.status !== 'ACTIVE')
            .sort((a, b) => b.utilization_percent - a.utilization_percent)
            .slice(0, 8);
        const recentlyJoined = consultants.slice(0, 5).map((c) => ({
            id: c.id,
            name: `${c.first_name} ${c.last_name}`.trim(),
            role: c.role,
            created_at: c.created_at,
        }));
        return {
            summary: {
                total_staff: totalStaff,
                active_staff: activeStaff,
                suspended_staff: suspendedStaff,
                on_leave_staff: onLeaveStaff,
                inactive_staff: inactiveStaff,
                total_revenue: totalRevenue,
                total_placements: totalPlacements,
                avg_success_rate: Number(avgSuccessRate.toFixed(1)),
                avg_utilization_percent: Number(avgUtilization.toFixed(1)),
            },
            role_distribution: roleDistribution,
            status_distribution: statusDistribution,
            capacity_distribution: capacityDistribution,
            top_performers: topPerformers,
            workload_alerts: workloadAlerts,
            recently_joined: recentlyJoined,
        };
    }
    async getById(id) {
        const consultant = await this.staffRepository.findById(id);
        if (!consultant) {
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        }
        return this.mapToFrontend(consultant);
    }
    async create(data) {
        // Validation
        const requiredFields = ['email', 'firstName', 'lastName', 'role', 'regionId', 'password'];
        const missingFields = requiredFields.filter(f => !data[f]);
        if (missingFields.length > 0) {
            throw new http_exception_1.HttpException(400, `Missing required fields: ${missingFields.join(', ')}`);
        }
        const existing = await this.staffRepository.findByEmail(data.email);
        if (existing) {
            throw new http_exception_1.HttpException(409, 'Email already in use');
        }
        const { password, firstName, lastName, regionId, defaultCommissionRate, ...rest } = data;
        const passwordHash = await (0, password_1.hashPassword)(password);
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
    async update(id, data) {
        // Prevent password update via this method
        delete data.password;
        delete data.password_hash;
        // Map camelCase to snake_case if present
        const mappedData = { ...data };
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
    async suspend(id) {
        return this.staffRepository.update(id, { status: 'SUSPENDED' });
    }
    async reactivate(id) {
        return this.staffRepository.update(id, { status: 'ACTIVE' });
    }
    async delete(id) {
        // Check if consultant has active assignments
        const activeAssignments = await prisma_1.prisma.consultantJobAssignment.count({
            where: { consultant_id: id, status: 'ACTIVE' }
        });
        if (activeAssignments > 0) {
            throw new http_exception_1.HttpException(400, `Cannot delete consultant with ${activeAssignments} active job assignments. Reassign them first.`);
        }
        return this.staffRepository.delete(id);
    }
    async assignRegion(id, regionId) {
        return this.staffRepository.update(id, { region: { connect: { id: regionId } } });
    }
    async generateEmail(firstName, lastName, consultantId) {
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@hrm8.email`;
        // In real app, we would check for uniqueness and add suffix if needed
        return { email };
    }
    async getPendingTasks(id) {
        const activeAssignments = await prisma_1.prisma.consultantJobAssignment.findMany({
            where: { consultant_id: id, status: 'ACTIVE' },
            include: { job: true }
        });
        return {
            assignments: activeAssignments,
            count: activeAssignments.length
        };
    }
    async getConsultantsForReassignment(id, role, regionId) {
        return this.staffRepository.findMany({
            where: {
                id: { not: id },
                role,
                region_id: regionId,
                status: 'ACTIVE'
            }
        });
    }
    async reassignJobs(id, targetConsultantId) {
        return prisma_1.prisma.$transaction(async (tx) => {
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
    async changeRoleWithTaskHandling(id, role, taskAction, targetConsultantId) {
        const pending = await this.getPendingTasks(id);
        let taskResult = null;
        if (pending.count > 0) {
            if (taskAction === 'REASSIGN' && targetConsultantId) {
                taskResult = await this.reassignJobs(id, targetConsultantId);
            }
            else if (taskAction === 'TERMINATE') {
                await prisma_1.prisma.consultantJobAssignment.updateMany({
                    where: { consultant_id: id, status: 'ACTIVE' },
                    data: { status: 'INACTIVE', pipeline_stage: 'CLOSED' }
                });
                await prisma_1.prisma.consultant.update({
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
exports.StaffService = StaffService;
