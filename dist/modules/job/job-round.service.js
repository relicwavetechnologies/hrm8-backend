"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobRoundService = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
class JobRoundService extends service_1.BaseService {
    constructor(jobRoundRepository, jobRepository) {
        super();
        this.jobRoundRepository = jobRoundRepository;
        this.jobRepository = jobRepository;
    }
    /** Resolve members by job role and assign them as round interviewers (Simple Flow). */
    async assignInterviewersByRole(jobId, roundId, assignedRoleId) {
        const userIds = await this.jobRepository.getMemberUserIdsByJobRoleId(jobId, assignedRoleId);
        if (userIds.length === 0)
            return;
        await this.jobRoundRepository.upsertInterviewConfig(roundId, {
            assignedInterviewerIds: userIds,
        });
        // TODO: Trigger "Added to Round" notifications/emails for userIds
    }
    async initializeFixedRounds(jobId) {
        const existingRounds = await this.jobRoundRepository.findByJobId(jobId);
        const existingFixedKeys = existingRounds
            .filter((r) => r.is_fixed && r.fixed_key)
            .map((r) => r.fixed_key);
        // Helper to create round if missing
        const createIfMissing = async (key, name, order, type) => {
            if (!existingFixedKeys.includes(key)) {
                await this.jobRoundRepository.create({
                    job: { connect: { id: jobId } },
                    name,
                    type,
                    order,
                    is_fixed: true,
                    fixed_key: key,
                });
            }
        };
        // Initialize default fixed rounds
        // Using ASSESSMENT type for non-interview stages to distinguish from INTERVIEW type
        // which triggers specific frontend logic/badges.
        await createIfMissing('NEW', 'New', 1, 'ASSESSMENT');
        await createIfMissing('OFFER', 'Offer', 999, 'ASSESSMENT');
        await createIfMissing('HIRED', 'Hired', 1000, 'ASSESSMENT');
        await createIfMissing('REJECTED', 'Rejected', 1001, 'ASSESSMENT');
    }
    async initializeSimpleRounds(jobId) {
        // 1. Ensure fixed rounds exist
        await this.initializeFixedRounds(jobId);
        // 2. Ensure "Screening" and "Interview" exist
        //    We check by name for simplicity in this flow.
        const allRounds = await this.jobRoundRepository.findByJobId(jobId);
        const hasScreening = allRounds.some(r => r.name === 'Screening');
        const hasInterview = allRounds.some(r => r.name === 'Interview');
        if (!hasScreening) {
            await this.jobRoundRepository.create({
                job: { connect: { id: jobId } },
                name: 'Screening',
                type: 'INTERVIEW', // Using INTERVIEW so it stands out, even if manual
                order: 2,
                is_fixed: false,
            });
        }
        if (!hasInterview) {
            await this.jobRoundRepository.create({
                job: { connect: { id: jobId } },
                name: 'Interview',
                type: 'INTERVIEW',
                order: 3,
                is_fixed: false,
            });
        }
    }
    mapToResponse(round) {
        if (!round)
            return null;
        return {
            id: round.id,
            jobId: round.job_id,
            name: round.name,
            order: round.order,
            type: round.type,
            isFixed: round.is_fixed,
            fixedKey: round.fixed_key,
            assignedRoleId: round.assigned_role_id ?? undefined,
            syncPermissions: round.sync_permissions ?? true,
            autoMoveOnPass: round.auto_move_on_pass ?? false,
            createdAt: round.created_at,
            updatedAt: round.updated_at,
        };
    }
    async getJobRounds(jobId) {
        // Ensure fixed rounds exist
        await this.initializeFixedRounds(jobId);
        const rounds = await this.jobRoundRepository.findByJobId(jobId);
        return { rounds: rounds.map(r => this.mapToResponse(r)) };
    }
    async createRound(jobId, data) {
        const job = await this.jobRepository.findById(jobId);
        if (!job)
            throw new http_exception_1.HttpException(404, 'Job not found');
        // Simple flow allows both INTERVIEW (with role) and ASSESSMENT (normal round); no automation/assessment config
        // No need to block ASSESSMENT here; saveAssessmentConfig is already blocked for SIMPLE jobs.
        const existingRounds = await this.jobRoundRepository.findByJobId(jobId);
        const fixedRounds = existingRounds.filter((r) => r.is_fixed);
        const customRounds = existingRounds.filter((r) => !r.is_fixed);
        // Find the first fixed round order (OFFER at 999, or higher)
        const fixedOrders = fixedRounds.map((r) => r.order);
        const minFixedOrder = fixedOrders.length > 0 ? Math.min(...fixedOrders.filter((o) => o > 1)) : 999;
        // Find max order among custom rounds
        const customOrders = customRounds.map((r) => r.order);
        const maxCustomOrder = customOrders.length > 0 ? Math.max(...customOrders) : 1;
        // Place new round after last custom round, but before fixed rounds
        const newOrder = Math.min(maxCustomOrder + 1, minFixedOrder - 1);
        const round = await this.jobRoundRepository.create({
            job: { connect: { id: jobId } },
            name: data.name,
            type: data.type,
            order: newOrder,
            is_fixed: false,
            ...(data.assignedRoleId
                ? { assigned_role: { connect: { id: data.assignedRoleId } } }
                : {}),
        });
        // Simple Flow: auto-assign interviewers by role when round is INTERVIEW and has assignedRoleId
        if (data.type === 'INTERVIEW' && data.assignedRoleId) {
            await this.assignInterviewersByRole(jobId, round.id, data.assignedRoleId);
        }
        // Advanced: auto-move on pass in linked config
        if (data.autoMoveOnPass === true) {
            if (data.type === 'INTERVIEW') {
                await this.jobRoundRepository.upsertInterviewConfig(round.id, { autoMoveOnPass: true });
            }
            else if (data.type === 'ASSESSMENT') {
                await this.jobRoundRepository.upsertAssessmentConfig(round.id, { autoMoveOnPass: true });
            }
        }
        return { round: this.mapToResponse(round) };
    }
    async updateRound(jobId, roundId, data) {
        const target = await this.jobRoundRepository.findById(roundId);
        if (!target)
            throw new http_exception_1.HttpException(404, 'Round not found');
        if (target.job_id !== jobId)
            throw new http_exception_1.HttpException(403, 'Round does not belong to job');
        // Fixed rounds: allow only assigned_role_id and sync_permissions (email_config via separate endpoint)
        if (target.is_fixed) {
            const fixedPayload = {};
            if (data.assignedRoleId !== undefined) {
                fixedPayload.assigned_role = data.assignedRoleId
                    ? { connect: { id: data.assignedRoleId } }
                    : { disconnect: true };
            }
            if (data.syncPermissions !== undefined) {
                fixedPayload.sync_permissions = data.syncPermissions;
            }
            if (data.autoMoveOnPass !== undefined) {
                fixedPayload.auto_move_on_pass = data.autoMoveOnPass;
            }
            if (Object.keys(fixedPayload).length === 0) {
                return { round: this.mapToResponse(target) };
            }
            const updated = await this.jobRoundRepository.update(roundId, fixedPayload);
            return { round: this.mapToResponse(updated) };
        }
        // If order is being changed
        if (data.order !== undefined && data.order !== target.order) {
            const allRounds = await this.jobRoundRepository.findByJobId(jobId);
            const fixedRounds = allRounds.filter((r) => r.is_fixed);
            const customRounds = allRounds.filter((r) => !r.is_fixed && r.id !== roundId);
            const fixedOrders = fixedRounds.map((r) => r.order);
            const minFixedOrder = fixedOrders.length > 0 ? Math.min(...fixedOrders.filter((o) => o > 1)) : 999;
            let newOrder = data.order;
            if (newOrder >= minFixedOrder) {
                newOrder = minFixedOrder - 1;
            }
            if (newOrder < 2)
                newOrder = 2; // Should not go before NEW (1)
            // Reorder custom rounds
            // Sort custom rounds by current order
            customRounds.sort((a, b) => a.order - b.order);
            // We want to place `target` such that its index results in `newOrder`.
            // `customRounds` range from 2 to (1 + count).
            // Clamp newOrder
            if (newOrder > customRounds.length + 2)
                newOrder = customRounds.length + 2;
            // Adjust newOrder to be relative to custom rounds (0-based index)
            // Custom rounds start at order 2. So index = newOrder - 2.
            let targetIndex = newOrder - 2;
            if (targetIndex < 0)
                targetIndex = 0;
            if (targetIndex > customRounds.length)
                targetIndex = customRounds.length;
            const roundsToReorder = [...customRounds];
            roundsToReorder.splice(targetIndex, 0, target);
            // Save all references that changed
            let orderCounter = 2;
            for (const r of roundsToReorder) {
                if (r.order !== orderCounter) {
                    await this.jobRoundRepository.update(r.id, { order: orderCounter });
                }
                orderCounter++;
            }
            // Refresh target and update other fields
            let updated = await this.jobRoundRepository.findById(roundId);
            if (data.name || data.type) {
                updated = await this.jobRoundRepository.update(roundId, {
                    name: data.name ?? target.name,
                    type: data.type ?? target.type,
                });
            }
            return { round: this.mapToResponse(updated) };
        }
        const updatePayload = {
            name: data.name,
            type: data.type,
        };
        if (data.assignedRoleId !== undefined) {
            updatePayload.assigned_role = data.assignedRoleId
                ? { connect: { id: data.assignedRoleId } }
                : { disconnect: true };
        }
        if (data.syncPermissions !== undefined) {
            updatePayload.sync_permissions = data.syncPermissions;
        }
        const updated = await this.jobRoundRepository.update(roundId, updatePayload);
        // Simple Flow: when assignedRoleId is set on an INTERVIEW round, sync interviewers
        if (updated.type === 'INTERVIEW' && (data.assignedRoleId ?? updated.assigned_role_id)) {
            const roleId = data.assignedRoleId ?? updated.assigned_role_id;
            await this.assignInterviewersByRole(jobId, roundId, roleId);
        }
        // Advanced: update auto_move_on_pass and require_all_interviewers in linked config
        if (data.autoMoveOnPass !== undefined || data.requireAllInterviewers !== undefined) {
            if (updated.type === 'INTERVIEW') {
                await this.jobRoundRepository.upsertInterviewConfig(roundId, {
                    ...(data.autoMoveOnPass !== undefined && { autoMoveOnPass: data.autoMoveOnPass }),
                    ...(data.requireAllInterviewers !== undefined && { requireAllInterviewers: data.requireAllInterviewers }),
                });
            }
            else if (updated.type === 'ASSESSMENT') {
                if (data.autoMoveOnPass !== undefined) {
                    await this.jobRoundRepository.upsertAssessmentConfig(roundId, { autoMoveOnPass: data.autoMoveOnPass });
                }
            }
        }
        return { round: this.mapToResponse(updated) };
    }
    async deleteRound(jobId, roundId) {
        const round = await this.jobRoundRepository.findById(roundId);
        if (!round)
            throw new http_exception_1.HttpException(404, 'Round not found');
        if (round.job_id !== jobId)
            throw new http_exception_1.HttpException(403, 'Round does not belong to job');
        if (round.is_fixed) {
            throw new http_exception_1.HttpException(400, 'Fixed rounds cannot be deleted');
        }
        await this.jobRoundRepository.delete(roundId);
        // Normalize orders after delete
        const customRounds = (await this.jobRoundRepository.findByJobId(jobId)).filter(r => !r.is_fixed);
        let orderCounter = 2;
        for (const r of customRounds) {
            if (r.order !== orderCounter) {
                await this.jobRoundRepository.update(r.id, { order: orderCounter });
            }
            orderCounter++;
        }
        return { success: true };
    }
    // Interview Configuration Methods
    async getInterviewConfig(roundId) {
        return this.jobRoundRepository.getInterviewConfig(roundId);
    }
    async saveInterviewConfig(roundId, data) {
        return this.jobRoundRepository.upsertInterviewConfig(roundId, data);
    }
    // Assessment Configuration Methods
    async getAssessmentConfig(roundId) {
        return this.jobRoundRepository.getAssessmentConfig(roundId);
    }
    async saveAssessmentConfig(roundId, data) {
        const round = await this.jobRoundRepository.findById(roundId);
        if (!round)
            throw new http_exception_1.HttpException(404, 'Round not found');
        return this.jobRoundRepository.upsertAssessmentConfig(roundId, data);
    }
}
exports.JobRoundService = JobRoundService;
