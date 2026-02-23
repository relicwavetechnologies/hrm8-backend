import { prisma } from '../../utils/prisma';
import { HttpException } from '../../core/http-exception';
import { ApplicationStatus, ApplicationStage, ActorType } from '@prisma/client';
import { ApplicationActivityService } from '../application/application-activity.service';

export class ConsultantCandidateService {

    async getPipeline(consultantId: string, jobId: string) {
        // 1. Verify Job Assignment
        await this.verifyJobAccess(consultantId, jobId);

        // 2. Fetch Applications with deep included data
        const applications = await prisma.application.findMany({
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

    async updateStatus(consultantId: string, applicationId: string, status: ApplicationStatus, stage?: ApplicationStage) {
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: { job: true }
        });

        if (!application) throw new HttpException(404, 'Application not found');

        await this.verifyJobAccess(consultantId, application.job_id);

        const updatedApp = await prisma.application.update({
            where: { id: applicationId },
            data: {
                status,
                stage: stage || undefined,
                updated_at: new Date()
            }
        });

        await ApplicationActivityService.logSafe({
            applicationId,
            actorId: consultantId,
            actorType: ActorType.CONSULTANT,
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

    async addNote(consultantId: string, applicationId: string, note: string) {
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: { job: true }
        });

        if (!application) throw new HttpException(404, 'Application not found');
        await this.verifyJobAccess(consultantId, application.job_id);

        const consultant = await prisma.consultant.findUnique({ where: { id: consultantId } });
        if (!consultant) throw new HttpException(404, 'Consultant not found');

        const newNote = `[${new Date().toISOString()}] ${consultant.first_name}: ${note}\n`;
        const currentNotes = application.recruiter_notes || '';

        const updated = await prisma.application.update({
            where: { id: applicationId },
            data: {
                recruiter_notes: currentNotes + newNote
            }
        });

        await ApplicationActivityService.logSafe({
            applicationId,
            actorId: consultantId,
            actorType: ActorType.CONSULTANT,
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

    async moveToRound(consultantId: string, applicationId: string, roundId: string) {
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: { job: true }
        });

        if (!application) throw new HttpException(404, 'Application not found');
        await this.verifyJobAccess(consultantId, application.job_id);

        const round = await prisma.jobRound.findFirst({
            where: { id: roundId, job_id: application.job_id }
        });

        if (!round) throw new HttpException(400, 'Invalid round for this job');

        // Logic to determine new stage based on fixed round keys
        let newStage: ApplicationStage | undefined;
        if (round.is_fixed) {
            switch (round.fixed_key) {
                case 'NEW': newStage = 'NEW_APPLICATION'; break;
                case 'OFFER': newStage = 'OFFER_EXTENDED'; break;
                case 'HIRED': newStage = 'OFFER_ACCEPTED'; break;
                case 'REJECTED': newStage = 'REJECTED'; break;
            }
        }

        // Upsert round progress
        await prisma.applicationRoundProgress.upsert({
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
        if (newStage) {
            await prisma.application.update({
                where: { id: applicationId },
                data: { stage: newStage, updated_at: new Date() }
            });
        }

        await ApplicationActivityService.logSafe({
            applicationId,
            actorId: consultantId,
            actorType: ActorType.CONSULTANT,
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

    async updateStage(consultantId: string, applicationId: string, stage: ApplicationStage) {
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: { job: true }
        });

        if (!application) throw new HttpException(404, 'Application not found');
        await this.verifyJobAccess(consultantId, application.job_id);

        const updatedApp = await prisma.application.update({
            where: { id: applicationId },
            data: {
                stage,
                updated_at: new Date()
            }
        });

        await ApplicationActivityService.logSafe({
            applicationId,
            actorId: consultantId,
            actorType: ActorType.CONSULTANT,
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

    async getJobRounds(consultantId: string, jobId: string) {
        await this.verifyJobAccess(consultantId, jobId);

        return prisma.jobRound.findMany({
            where: { job_id: jobId },
            orderBy: { order: 'asc' }
        });
    }

    private async verifyJobAccess(consultantId: string, jobId: string) {
        // Direct assignment check
        const assignment = await prisma.consultantJobAssignment.findFirst({
            where: { consultant_id: consultantId, job_id: jobId, status: 'ACTIVE' }
        });

        if (assignment) return true;

        // Fallback: Check if job is directly assigned in Job table (primary owner)
        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (job && job.assigned_consultant_id === consultantId) return true;

        // Use Regional Logic if desired, but user asked for strictness initially. 
        // Legacy had: if (job.assigned_consultant_id !== consultant.id && !isRegionalAllowed)
        // I'll stick to assignment check for now for security, can expand if user requests Regional logic.

        throw new HttpException(403, 'Consultant is not assigned to this job');
    }
}
