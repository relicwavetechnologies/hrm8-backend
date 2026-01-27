import { BaseRepository } from '../../core/repository';
import { Prisma, Candidate, JobInvitation } from '@prisma/client';
import { SearchTalentRequest } from './talent-pool.types';

export class TalentPoolRepository extends BaseRepository {
    /**
     * Search candidates with advanced filtering
     */
    async searchCandidates(filters: SearchTalentRequest & { skip: number }) {
        const { query, skills, location, experienceMin, experienceMax, skip, limit } = filters;

        // Build the where clause
        const where: Prisma.CandidateWhereInput = {};

        // 1. Full text search (name, email, city)
        if (query) {
            where.OR = [
                { first_name: { contains: query, mode: 'insensitive' } },
                { last_name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { city: { contains: query, mode: 'insensitive' } },
            ];
        }

        // 2. Location filter
        if (location) {
            where.OR = [
                ...(where.OR || []),
                { city: { contains: location, mode: 'insensitive' } },
                { state: { contains: location, mode: 'insensitive' } },
                { country: { contains: location, mode: 'insensitive' } },
            ];
        }

        // 3. Skills filter (Assuming CandidateSkill relation)
        if (skills && skills.length > 0) {
            where.skills = {
                some: {
                    name: {
                        in: skills,
                        mode: 'insensitive',
                    },
                },
            };
        }

        // 4. Experience filter (Using WorkExperience relation or derived fields?)
        // This is tricky if it's not a direct field. 
        // Assuming we calculate it or just rely on WorkExperience list existence/dates.
        // For now, let's skip complex duration calculation in Prisma and perhaps filtering via "has experience"
        // or if `Candidate` has a `total_years_experience` field (doesn't look like it in schema, checked).
        // We can filter those who have work_experience entries if min > 0
        if (experienceMin && experienceMin > 0) {
            where.work_experience = {
                some: {} // At least some experience
            };
        }

        const [candidates, total] = await Promise.all([
            this.prisma.candidate.findMany({
                where,
                skip,
                take: limit,
                include: {
                    skills: true,
                    work_experience: {
                        orderBy: { start_date: 'desc' },
                        take: 1
                    },
                    education: {
                        orderBy: { end_date: 'desc' },
                        take: 1
                    }
                },
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.candidate.count({ where }),
        ]);

        return { candidates, total };
    }

    /**
     * Create Job Invitation
     */
    async createInvitation(data: Prisma.JobInvitationCreateInput): Promise<JobInvitation> {
        return this.prisma.jobInvitation.create({
            data,
        });
    }

    /**
     * Find Invitation by Token
     */
    async findInvitationByToken(token: string): Promise<JobInvitation | null> {
        return this.prisma.jobInvitation.findUnique({
            where: { token },
            include: {
                job: {
                    select: {
                        title: true,
                        description: true,
                        company: {
                            select: { name: true } // Assuming company model has logo (CompanyProfile check needed)
                        }
                    }
                },
                candidate: {
                    select: { first_name: true, last_name: true, email: true }
                }
            }
        });
    }

    /**
     * Find Invitation by Job and Email (to prevent duplicates)
     */
    async findInvitation(jobId: string, email: string): Promise<JobInvitation | null> {
        return this.prisma.jobInvitation.findUnique({
            where: {
                job_id_email: {
                    job_id: jobId,
                    email: email,
                },
            },
        });
    }
}
