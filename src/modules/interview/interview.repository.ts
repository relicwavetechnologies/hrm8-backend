import { BaseRepository } from '../../core/repository';
import { InterviewStatus, VideoInterviewType } from '../../types';

export class InterviewRepository extends BaseRepository {
    async create(data: any) {
        return this.prisma.videoInterview.create({
            data: {
                application_id: data.applicationId,
                candidate_id: data.candidateId,
                job_id: data.jobId,
                job_round_id: data.jobRoundId,
                scheduled_date: data.scheduledDate,
                duration: data.duration,
                meeting_link: data.meetingLink,
                status: InterviewStatus.SCHEDULED,
                type: data.type || VideoInterviewType.VIDEO,
                interviewer_ids: data.interviewerIds || [],
                notes: data.notes,
                is_auto_scheduled: data.isAutoScheduled || false,
            },
        });
    }

    async findById(id: string) {
        return this.prisma.videoInterview.findUnique({
            where: { id },
            include: {
                application: { include: { candidate: true, job: { include: { company: true } } } },
            },
        });
    }

    async update(id: string, data: any) {
        return this.prisma.videoInterview.update({
            where: { id },
            data,
        });
    }

    async findAll(filters: {
        jobId?: string;
        jobRoundId?: string;
        status?: InterviewStatus | string;
        startDate?: Date;
        endDate?: Date;
    }) {
        const where: any = {};
        if (filters.jobId) where.job_id = filters.jobId;
        if (filters.jobRoundId) where.job_round_id = filters.jobRoundId;
        if (filters.status && filters.status !== 'ALL') where.status = filters.status;
        if (filters.startDate || filters.endDate) {
            where.scheduled_date = {};
            if (filters.startDate) where.scheduled_date.gte = filters.startDate;
            if (filters.endDate) where.scheduled_date.lte = filters.endDate;
        }

        return this.prisma.videoInterview.findMany({
            where,
            include: {
                application: { include: { candidate: true, job: { include: { company: true } } } },
            },
            orderBy: { scheduled_date: 'asc' },
        });
    }

    async addFeedback(interviewId: string, feedbackData: any) {
        return this.prisma.interviewFeedback.create({
            data: {
                video_interview_id: interviewId,
                interviewer_id: feedbackData.interviewerId,
                interviewer_name: feedbackData.interviewerName,
                overall_rating: feedbackData.overallRating,
                notes: feedbackData.notes,
                recommendation: feedbackData.recommendation
            }
        });
    }

    async findApplicationById(id: string) {
        return this.prisma.application.findUnique({
            where: { id },
            include: { candidate: true, job: { include: { company: true } } }
        });
    }

    async upsertProgress(where: any, create: any, update: any) {
        return this.prisma.applicationRoundProgress.upsert({
            where, create, update
        });
    }
}
