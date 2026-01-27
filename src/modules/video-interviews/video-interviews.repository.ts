import { BaseRepository } from '../../core/repository';
import { Prisma, VideoInterview } from '@prisma/client';

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
                        // Need to join via application to get candidate details usually, 
                        // but we can just return what we have
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
     * Find interviews for a candidate
     */
    async findAllByCandidate(candidateId: string) {
        return this.prisma.videoInterview.findMany({
            where: { candidate_id: candidateId },
            orderBy: { scheduled_date: 'desc' },
        });
    }

    /**
     * Find interviews for an interviewer
     * Since interviewer_ids is JSON, we might need raw query or check if Prisma supports array contains on Json
     * Prisma JSON filtering is limited. For now, we fetch relevant ones or strict match?
     * Actually, if interviewer_ids is just an array of strings in JSON, we can try array_contains.
     * But PostgreSQL JSONB supports @> operator.
     */
    /*
    async findAllByInterviewer(interviewerId: string) {
        // Prisma doesn't fully support querying inside JSON arrays easily without raw query or specific structure
        // However, if we assume the scale is manageable, we might filter in application or use raw query.
        // For proper specific JSON array containment:
        // return this.prisma.videoInterview.findMany({
        //   where: {
        //     interviewer_ids: {
        //       array_contains: interviewerId  <-- This assumes it's stored as JSON array ["id1", "id2"]
        //     }
        //   }
        // });
        // Let's safe-guard with raw query if needed, or simple fetch if standard prisma constraints apply.
        // Given it's migration, let's defer exact JSON filter logic or use raw if 100% needed.
        // Let's allow fetching by larger context instead for now (e.g. company) and filter in memory? No that's bad.
        
        // Attempting standard Prisma JSON filter:
        return this.prisma.videoInterview.findMany({
          where: {
            interviewer_ids: {
               array_contains: interviewerId
            }
          }
        })
    }
    */
}
