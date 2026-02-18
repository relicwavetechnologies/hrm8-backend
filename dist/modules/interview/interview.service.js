"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewService = void 0;
const prisma_1 = require("../../utils/prisma");
const google_calendar_service_1 = require("../integration/google-calendar.service");
const email_service_1 = require("../email/email.service");
const notification_service_1 = require("../notification/notification.service");
const notification_repository_1 = require("../notification/notification.repository");
const client_1 = require("@prisma/client");
const notificationService = new notification_service_1.NotificationService(new notification_repository_1.NotificationRepository());
class InterviewService {
    static async autoScheduleInterview(params) {
        // 1. Load config
        const config = await prisma_1.prisma.interviewConfiguration.findUnique({
            where: { job_round_id: params.jobRoundId }
        });
        if (!config || !config.enabled || !config.auto_schedule) {
            throw new Error('Interview auto-scheduling is not enabled for this round');
        }
        if (!config.default_duration || config.default_duration <= 0) {
            throw new Error('Invalid default duration');
        }
        // 2. Check existing
        const existing = await prisma_1.prisma.videoInterview.findFirst({
            where: {
                job_round_id: params.jobRoundId,
                application_id: params.applicationId,
                status: { in: ['SCHEDULED', 'RESCHEDULED', 'IN_PROGRESS'] }
            }
        });
        if (existing)
            return existing;
        // 3. Load Data
        const application = await prisma_1.prisma.application.findUnique({
            where: { id: params.applicationId },
            include: { candidate: true, job: true }
        });
        if (!application || !application.candidate || !application.job) {
            throw new Error('Application data incomplete');
        }
        // 4. Find Slot (Simplified logic for migration)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(10, 0, 0, 0); // Default to tomorrow 10am
        // 5. Generate Link
        let meetingLink = null;
        if (config.interview_format === 'LIVE_VIDEO') {
            const end = new Date(startDate.getTime() + (config.default_duration * 60000));
            const evt = await google_calendar_service_1.GoogleCalendarService.createVideoInterviewEvent({
                summary: `Interview: ${application.job.title}`,
                start: startDate,
                end: end,
                attendees: [{ email: application.candidate.email }]
            });
            meetingLink = evt.meetingLink || null;
        }
        // 6. Create Interview
        const interview = await prisma_1.prisma.videoInterview.create({
            data: {
                application_id: params.applicationId,
                candidate_id: application.candidate_id,
                job_id: application.job_id,
                job_round_id: params.jobRoundId,
                scheduled_date: startDate,
                duration: config.default_duration,
                meeting_link: meetingLink,
                status: 'SCHEDULED',
                type: 'VIDEO', // Default
                interviewer_ids: config.assigned_interviewer_ids || [],
                is_auto_scheduled: true
            }
        });
        // 7. Update Progress
        await prisma_1.prisma.applicationRoundProgress.upsert({
            where: {
                application_id_job_round_id: {
                    application_id: params.applicationId,
                    job_round_id: params.jobRoundId
                }
            },
            create: {
                application_id: params.applicationId,
                job_round_id: params.jobRoundId,
                video_interview_id: interview.id,
                completed: false
            },
            update: {
                video_interview_id: interview.id
            }
        });
        // 8. Notifications
        await email_service_1.emailService.sendInterviewInvitation({
            to: application.candidate.email,
            candidateName: application.candidate.first_name,
            jobTitle: application.job.title,
            companyName: 'Company', // Fetch company name if needed
            scheduledDate: startDate,
            meetingLink: meetingLink || undefined,
            interviewType: 'Video'
        });
        await notificationService.createNotification({
            recipientType: client_1.NotificationRecipientType.CANDIDATE,
            recipientId: application.candidate_id,
            type: client_1.UniversalNotificationType.INTERVIEW_SCHEDULED,
            title: 'Interview Scheduled',
            message: `Interview for ${application.job.title} scheduled.`,
            actionUrl: `/candidate/applications/${params.applicationId}?tab=interviews`
        });
        return interview;
    }
    static async createInterview(params) {
        const application = await prisma_1.prisma.application.findUnique({
            where: { id: params.applicationId },
            include: { candidate: true, job: true }
        });
        if (!application)
            throw new Error('Application not found');
        // Create
        const interview = await prisma_1.prisma.videoInterview.create({
            data: {
                application_id: params.applicationId,
                candidate_id: application.candidate_id,
                job_id: application.job_id,
                job_round_id: params.jobRoundId,
                scheduled_date: params.scheduledDate,
                duration: params.duration,
                meeting_link: params.meetingLink,
                status: 'SCHEDULED',
                type: params.type,
                interviewer_ids: params.interviewerIds || [],
                notes: params.notes,
                is_auto_scheduled: false
            }
        });
        // Notify
        if (application.candidate) {
            await email_service_1.emailService.sendInterviewInvitation({
                to: application.candidate.email,
                candidateName: application.candidate.first_name,
                jobTitle: application.job.title,
                companyName: 'Company',
                scheduledDate: params.scheduledDate,
                meetingLink: params.meetingLink,
                interviewType: params.type
            });
            await notificationService.createNotification({
                recipientType: client_1.NotificationRecipientType.CANDIDATE,
                recipientId: application.candidate_id,
                type: client_1.UniversalNotificationType.INTERVIEW_SCHEDULED,
                title: 'Interview Scheduled',
                message: `Interview for ${application.job.title} scheduled.`,
                actionUrl: `/candidate/applications/${params.applicationId}?tab=interviews`
            });
        }
        return interview;
    }
    static async getInterviews(filters) {
        const where = {};
        if (filters.jobId)
            where.job_id = filters.jobId;
        if (filters.applicationId)
            where.application_id = filters.applicationId;
        if (filters.jobRoundId)
            where.job_round_id = filters.jobRoundId;
        if (filters.status)
            where.status = filters.status;
        if (filters.startDate || filters.endDate) {
            where.scheduled_date = {};
            if (filters.startDate)
                where.scheduled_date.gte = filters.startDate;
            if (filters.endDate)
                where.scheduled_date.lte = filters.endDate;
        }
        const interviews = await prisma_1.prisma.videoInterview.findMany({
            where,
            include: {
                application: {
                    include: {
                        candidate: true
                    }
                },
                job_round: true
            },
            orderBy: { scheduled_date: 'asc' }
        });
        return interviews.map(i => this.mapToDTO(i));
    }
    static async getInterviewById(id) {
        const interview = await prisma_1.prisma.videoInterview.findUnique({
            where: { id },
            include: { application: { include: { candidate: true } }, job_round: true }
        });
        if (!interview)
            return null;
        return this.mapToDTO(interview);
    }
    static async updateStatus(id, status, notes) {
        const updated = await prisma_1.prisma.videoInterview.update({
            where: { id },
            data: { status, notes },
            include: { application: { include: { job: true } } }
        });
        if (updated.application?.candidate_id) {
            await notificationService.createNotification({
                recipientType: client_1.NotificationRecipientType.CANDIDATE,
                recipientId: updated.application.candidate_id,
                type: client_1.UniversalNotificationType.INTERVIEW_SCHEDULED,
                title: 'Interview Update',
                message: `Your interview status has been updated to ${status}.`,
                actionUrl: `/candidate/applications/${updated.application_id}?tab=interviews`
            });
        }
        return updated;
    }
    static async updateInterview(id, updates) {
        const data = {};
        if (updates.interviewerIds !== undefined)
            data.interviewer_ids = updates.interviewerIds;
        if (updates.scheduledDate !== undefined)
            data.scheduled_date = updates.scheduledDate;
        if (updates.duration !== undefined)
            data.duration = updates.duration;
        if (updates.type !== undefined)
            data.type = updates.type;
        if (updates.meetingLink !== undefined)
            data.meeting_link = updates.meetingLink;
        if (updates.notes !== undefined)
            data.notes = updates.notes;
        const updated = await prisma_1.prisma.videoInterview.update({
            where: { id },
            data,
            include: { application: { include: { candidate: true } }, job_round: true }
        });
        return this.mapToDTO(updated);
    }
    static async addFeedback(interviewId, feedback) {
        // Save feedback logic here (simplified)
        await prisma_1.prisma.interviewFeedback.create({
            data: {
                video_interview_id: interviewId,
                ...feedback
            }
        });
        // Recalculate score
        const allFeedbacks = await prisma_1.prisma.interviewFeedback.findMany({
            where: { video_interview_id: interviewId }
        });
        const totalScore = allFeedbacks.reduce((sum, fb) => sum + (fb.overall_rating || 0), 0);
        const averageScore = allFeedbacks.length > 0 ? totalScore / allFeedbacks.length : 0;
        await prisma_1.prisma.videoInterview.update({
            where: { id: interviewId },
            data: { overall_score: averageScore }
        });
        const updated = await prisma_1.prisma.videoInterview.findUnique({ where: { id: interviewId } });
        if (!updated)
            throw new Error('Interview not found');
        return this.mapToDTO(updated);
    }
    static async getProgressionStatus(interviewId) {
        const interview = await prisma_1.prisma.videoInterview.findUnique({ where: { id: interviewId } });
        if (!interview)
            throw new Error('Interview not found');
        const result = {
            canProgress: true,
            missingInterviewers: [],
            submittedCount: 0,
            totalCount: 0,
            requiresAllInterviewers: false,
        };
        if (!interview.job_round_id)
            return result;
        const config = await prisma_1.prisma.interviewConfiguration.findUnique({
            where: { job_round_id: interview.job_round_id }
        });
        if (!config || !config.require_all_interviewers)
            return result;
        result.requiresAllInterviewers = true;
        const assignedIds = interview.interviewer_ids || [];
        result.totalCount = assignedIds.length;
        if (result.totalCount === 0)
            return result;
        const feedbacks = await prisma_1.prisma.interviewFeedback.findMany({
            where: { video_interview_id: interviewId },
            select: { interviewer_id: true }
        });
        const submittedIds = feedbacks.map(f => f.interviewer_id).filter((id) => !!id);
        result.submittedCount = submittedIds.length;
        result.missingInterviewers = assignedIds.filter(id => !submittedIds.includes(id));
        if (result.missingInterviewers.length > 0) {
            result.canProgress = false;
        }
        return result;
    }
    static mapToDTO(interview) {
        return {
            id: interview.id,
            applicationId: interview.application_id,
            candidateId: interview.candidate_id,
            candidate: interview.application?.candidate ? {
                id: interview.application.candidate.id,
                firstName: interview.application.candidate.first_name,
                lastName: interview.application.candidate.last_name,
                email: interview.application.candidate.email,
                phone: interview.application.candidate.phone,
                photo: interview.application.candidate.photo,
                city: interview.application.candidate.city,
                state: interview.application.candidate.state,
                country: interview.application.candidate.country,
            } : undefined,
            jobId: interview.job_id,
            jobRoundId: interview.job_round_id,
            jobRound: interview.job_round ? {
                id: interview.job_round.id,
                name: interview.job_round.name,
            } : undefined,
            scheduledDate: interview.scheduled_date,
            duration: interview.duration,
            meetingLink: interview.meeting_link,
            status: interview.status,
            type: interview.type,
            interviewerIds: interview.interviewer_ids,
            isAutoScheduled: interview.is_auto_scheduled,
            cancellationReason: interview.cancellation_reason,
            noShowReason: interview.no_show_reason,
            createdAt: interview.created_at,
            updatedAt: interview.updated_at
        };
    }
}
exports.InterviewService = InterviewService;
