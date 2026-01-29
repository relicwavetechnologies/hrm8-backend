import { BaseRepository } from '../../core/repository';
import { Prisma, VideoInterview } from '@prisma/client';
import { SubmitFeedbackRequest } from './video-interviews.types';

export class VideoInterviewRepository extends BaseRepository {
    /**
     * Create a new video interview
     */
    async create(data: Prisma.VideoInterviewCreateInput): Promise<VideoInterview> {
        return this.prisma.videoInterview.create({
            data,
        });
    }

    /**
     * Find interview by ID
     */
    async findById(id: string): Promise<VideoInterview | null> {
        return this.prisma.videoInterview.findUnique({
            where: { id },
            include: {
                application: {
                    select: {
                        id: true,
                        job_id: true,
                        candidate_id: true,
                        status: true,
                    }
                },
                interview_feedback: true
            }
        });
    }

    /**
     * Update interview
     */
    async update(id: string, data: Prisma.VideoInterviewUpdateInput): Promise<VideoInterview> {
        return this.prisma.videoInterview.update({
            where: { id },
            data,
        });
    }

    /**
     * Find all interviews for a job
     */
    async findAllByJob(jobId: string) {
        return this.prisma.videoInterview.findMany({
            where: { job_id: jobId },
            orderBy: { scheduled_date: 'asc' },
            include: {
                application: {
                    select: {
                        candidate: {
                            select: {
                                first_name: true,
                                last_name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Find all interviews for a company
     */
    async findAllByCompany(companyId: string) {
        return this.prisma.videoInterview.findMany({
            where: {
                application: {
                    job: {
                        company_id: companyId
                    }
                }
            },
            orderBy: { scheduled_date: 'asc' },
            include: {
                application: {
                    select: {
                        candidate: {
                            select: {
                                first_name: true,
                                last_name: true,
                                email: true
                            }
                        },
                        job: {
                            select: {
                                title: true
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Find interviews for a candidate
     */
    async findAllByCandidate(candidateId: string) {
        return this.prisma.videoInterview.findMany({
            where: { candidate_id: candidateId },
            orderBy: { scheduled_date: 'desc' },
            include: {
                application: {
                    select: {
                        job: {
                            select: {
                                title: true,
                                company: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Find interviews for an application
     */
    async findAllByApplication(applicationId: string) {
        return this.prisma.videoInterview.findMany({
            where: { application_id: applicationId },
            orderBy: { scheduled_date: 'desc' },
        });
    }

    /**
     * Add feedback to an interview
     */
    async addFeedback(interviewId: string, interviewerId: string, interviewerName: string, data: SubmitFeedbackRequest) {
        return this.prisma.interviewFeedback.create({
            data: {
                video_interview_id: interviewId,
                interviewer_id: interviewerId,
                interviewer_name: interviewerName,
                overall_rating: data.overallRating,
                notes: data.notes,
                strengths: data.strengths,
                concerns: data.concerns,
                recommendation: data.recommendation,
                rating_criteria_scores: data.ratingCriteriaScores || {},
            },
        });
    }
}
