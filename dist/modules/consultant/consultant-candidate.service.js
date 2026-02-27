"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultantCandidateService = void 0;
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
const client_1 = require("@prisma/client");
const placement_commission_service_1 = require("../hrm8/placement-commission.service");
const application_activity_service_1 = require("../application/application-activity.service");
class ConsultantCandidateService {
    async getPipeline(consultantId, jobId) {
        // 1. Verify Job Assignment
        await this.verifyJobAccess(consultantId, jobId);
        // 2. Fetch Applications with deep included data
        const applications = await prisma_1.prisma.application.findMany({
            where: { job_id: jobId },
            include: {
                candidate: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        photo: true,
                        resume_url: true,
                        linked_in_url: true
                    }
                },
                video_interview: {
                    orderBy: { created_at: 'desc' },
                    take: 1
                },
                application_round_progress: {
                    orderBy: { updated_at: 'desc' },
                    take: 1
                }
            },
            orderBy: { applied_date: 'desc' }
        });
        // Map to flat structure for frontend if needed, or keeping it nested. 
        // Legacy controller did heavy mapping. We should try to keep it cleaner but compatible.
        // Let's return the structured data.
        return applications;
    }
    async updateStatus(consultantId, applicationId, status, stage) {
        const application = await prisma_1.prisma.application.findUnique({
            where: { id: applicationId },
            include: { job: true }
        });
        if (!application)
            throw new http_exception_1.HttpException(404, 'Application not found');
        await this.verifyJobAccess(consultantId, application.job_id);
        const wasHired = application.status === 'HIRED';
        const updatedApp = await prisma_1.prisma.application.update({
            where: { id: applicationId },
            data: {
                status,
                stage: stage || undefined,
                updated_at: new Date()
            }
        });
        if (!wasHired && status === 'HIRED') {
            try {
                const commissionResult = await placement_commission_service_1.PlacementCommissionService.createForHiredApplication(applicationId);
                if (commissionResult.created) {
                    console.log(`[ConsultantCandidateService] Placement commission created for hired application ${applicationId}`);
                }
                else {
                    console.log(`[ConsultantCandidateService] Placement commission skipped for application ${applicationId}: ${commissionResult.reason}`);
                }
            }
            catch (error) {
                console.error(`[ConsultantCandidateService] Failed to create placement commission for application ${applicationId}:`, error);
            }
        }
        await application_activity_service_1.ApplicationActivityService.logSafe({
            applicationId,
            actorId: consultantId,
            actorType: client_1.ActorType.CONSULTANT,
            action: 'stage_changed',
            subject: 'Application status updated',
            description: stage
                ? `Status set to ${status} and stage set to ${stage}`
                : `Status set to ${status}`,
            metadata: {
                status,
                stage: stage || null,
                source: 'consultant_pipeline',
            },
        });
        // Notify candidate logic could go here (e.g. email or in-app notification)
        return updatedApp;
    }
    async addNote(consultantId, applicationId, note) {
        const application = await prisma_1.prisma.application.findUnique({
            where: { id: applicationId },
            include: { job: true }
        });
        if (!application)
            throw new http_exception_1.HttpException(404, 'Application not found');
        await this.verifyJobAccess(consultantId, application.job_id);
        const consultant = await prisma_1.prisma.consultant.findUnique({ where: { id: consultantId } });
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        const newNote = `[${new Date().toISOString()}] ${consultant.first_name}: ${note}\n`;
        const currentNotes = application.recruiter_notes || '';
        const updated = await prisma_1.prisma.application.update({
            where: { id: applicationId },
            data: {
                recruiter_notes: currentNotes + newNote
            }
        });
        await application_activity_service_1.ApplicationActivityService.logSafe({
            applicationId,
            actorId: consultantId,
            actorType: client_1.ActorType.CONSULTANT,
            action: 'note_added',
            subject: 'Application note added',
            description: `${consultant.first_name} added a pipeline note`,
            metadata: {
                source: 'consultant_pipeline',
                notePreview: note.substring(0, 160),
            },
        });
        return updated;
    }
    async moveToRound(consultantId, applicationId, roundId) {
        const application = await prisma_1.prisma.application.findUnique({
            where: { id: applicationId },
            include: { job: true }
        });
        if (!application)
            throw new http_exception_1.HttpException(404, 'Application not found');
        await this.verifyJobAccess(consultantId, application.job_id);
        const round = await prisma_1.prisma.jobRound.findFirst({
            where: { id: roundId, job_id: application.job_id }
        });
        if (!round)
            throw new http_exception_1.HttpException(400, 'Invalid round for this job');
        // Logic to determine new stage based on fixed round keys
        let newStage;
        let newStatus;
        const wasHired = application.status === 'HIRED';
        if (round.is_fixed) {
            switch (round.fixed_key) {
                case 'NEW':
                    newStage = 'NEW_APPLICATION';
                    break;
                case 'OFFER':
                    newStage = 'OFFER_EXTENDED';
                    break;
                case 'HIRED':
                    newStage = 'OFFER_ACCEPTED';
                    newStatus = 'HIRED';
                    break;
                case 'REJECTED':
                    newStage = 'REJECTED';
                    break;
            }
        }
        // Upsert round progress
        await prisma_1.prisma.applicationRoundProgress.upsert({
            where: {
                application_id_job_round_id: {
                    application_id: applicationId,
                    job_round_id: roundId
                }
            },
            create: {
                application_id: applicationId,
                job_round_id: roundId,
                completed: false,
                updated_at: new Date()
            },
            update: {
                updated_at: new Date()
            }
        });
        // Update application stage if needed
        if (newStage || newStatus) {
            await prisma_1.prisma.application.update({
                where: { id: applicationId },
                data: {
                    stage: newStage || undefined,
                    status: newStatus || undefined,
                    updated_at: new Date()
                }
            });
        }
        if (!wasHired && newStatus === 'HIRED') {
            try {
                const commissionResult = await placement_commission_service_1.PlacementCommissionService.createForHiredApplication(applicationId);
                if (commissionResult.created) {
                    console.log(`[ConsultantCandidateService] Placement commission created for hired application ${applicationId}`);
                }
                else {
                    console.log(`[ConsultantCandidateService] Placement commission skipped for application ${applicationId}: ${commissionResult.reason}`);
                }
            }
            catch (error) {
                console.error(`[ConsultantCandidateService] Failed to create placement commission for application ${applicationId}:`, error);
            }
        }
        await application_activity_service_1.ApplicationActivityService.logSafe({
            applicationId,
            actorId: consultantId,
            actorType: client_1.ActorType.CONSULTANT,
            action: 'round_changed',
            subject: 'Candidate moved to round',
            description: `Moved candidate to ${round.name}`,
            metadata: {
                newRoundId: roundId,
                newRoundName: round.name,
                newStage: newStage || null,
                source: 'consultant_pipeline',
            },
        });
    }
    async updateStage(consultantId, applicationId, stage) {
        const application = await prisma_1.prisma.application.findUnique({
            where: { id: applicationId },
            include: { job: true }
        });
        if (!application)
            throw new http_exception_1.HttpException(404, 'Application not found');
        await this.verifyJobAccess(consultantId, application.job_id);
        const updatedApp = await prisma_1.prisma.application.update({
            where: { id: applicationId },
            data: {
                stage,
                updated_at: new Date()
            }
        });
        await application_activity_service_1.ApplicationActivityService.logSafe({
            applicationId,
            actorId: consultantId,
            actorType: client_1.ActorType.CONSULTANT,
            action: 'stage_changed',
            subject: 'Candidate stage changed',
            description: `Stage changed to ${stage}`,
            metadata: {
                newStage: stage,
                source: 'consultant_pipeline',
            },
        });
        return updatedApp;
    }
    async getJobRounds(consultantId, jobId) {
        await this.verifyJobAccess(consultantId, jobId);
        return prisma_1.prisma.jobRound.findMany({
            where: { job_id: jobId },
            orderBy: { order: 'asc' }
        });
    }
    async verifyJobAccess(consultantId, jobId) {
        // Direct assignment check
        const assignment = await prisma_1.prisma.consultantJobAssignment.findFirst({
            where: { consultant_id: consultantId, job_id: jobId, status: 'ACTIVE' }
        });
        if (assignment)
            return true;
        // Fallback: Check if job is directly assigned in Job table (primary owner)
        const job = await prisma_1.prisma.job.findUnique({ where: { id: jobId } });
        if (job && job.assigned_consultant_id === consultantId)
            return true;
        // Use Regional Logic if desired, but user asked for strictness initially. 
        // Legacy had: if (job.assigned_consultant_id !== consultant.id && !isRegionalAllowed)
        // I'll stick to assignment check for now for security, can expand if user requests Regional logic.
        throw new http_exception_1.HttpException(403, 'Consultant is not assigned to this job');
    }
}
exports.ConsultantCandidateService = ConsultantCandidateService;
