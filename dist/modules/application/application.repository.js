"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationRepository = void 0;
const repository_1 = require("../../core/repository");
class ApplicationRepository extends repository_1.BaseRepository {
    async create(data) {
        return this.prisma.application.create({ data });
    }
    async update(id, data) {
        return this.prisma.application.update({
            where: { id },
            data,
        });
    }
    async findById(id) {
        return this.prisma.application.findUnique({
            where: { id },
            include: {
                candidate: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        phone: true,
                        photo: true,
                        linked_in_url: true,
                        city: true,
                        state: true,
                        country: true,
                        email_verified: true,
                        status: true,
                        education: true,
                        skills: true,
                        work_experience: true,
                        resumes: {
                            where: { is_default: true },
                            take: 1
                        }
                    },
                },
                job: {
                    select: {
                        id: true,
                        title: true,
                        company: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                application_round_progress: {
                    include: {
                        job_round: true
                    },
                    orderBy: {
                        updated_at: 'desc'
                    }
                },
                assessment: {
                    include: {
                        assessment_response: true
                    }
                },
                questionnaire_response: true,
                video_interview: true,
                screening_result: true,
                evaluations: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                role: true
                            }
                        }
                    },
                    orderBy: {
                        created_at: 'desc'
                    }
                }
            },
        });
    }
    async findByCandidateId(candidateId) {
        return this.prisma.application.findMany({
            where: { candidate_id: candidateId },
            include: {
                job: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        location: true,
                        company: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async findByJobId(jobId, filters) {
        const where = { job_id: jobId };
        if (filters) {
            if (filters.status)
                where.status = filters.status;
            if (filters.stage)
                where.stage = filters.stage;
            if (filters.minScore !== undefined)
                where.score = { gte: filters.minScore };
            if (filters.maxScore !== undefined) {
                where.score = where.score ? { ...where.score, lte: filters.maxScore } : { lte: filters.maxScore };
            }
            if (filters.shortlisted !== undefined)
                where.shortlisted = filters.shortlisted;
        }
        return this.prisma.application.findMany({
            where,
            include: {
                candidate: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        phone: true,
                        photo: true,
                        linked_in_url: true,
                        city: true,
                        state: true,
                        country: true,
                        email_verified: true,
                        status: true,
                        skills: true,
                        work_experience: true,
                        education: true,
                    },
                },
                job: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                application_round_progress: {
                    include: {
                        job_round: true
                    },
                    orderBy: {
                        updated_at: 'desc'
                    },
                    take: 1
                },
                screening_result: true,
            },
            orderBy: [
                { shortlisted: 'desc' },
                { score: 'desc' },
                { created_at: 'desc' },
            ],
        });
    }
    async delete(id) {
        return this.prisma.application.delete({
            where: { id },
        });
    }
    async updateScore(id, score) {
        return this.prisma.application.update({
            where: { id },
            data: { score },
        });
    }
    async updateRank(id, rank) {
        return this.prisma.application.update({
            where: { id },
            data: { rank },
        });
    }
    async updateTags(id, tags) {
        return this.prisma.application.update({
            where: { id },
            data: { tags },
        });
    }
    async shortlist(id, userId) {
        return this.prisma.application.update({
            where: { id },
            data: {
                shortlisted: true,
                shortlisted_at: new Date(),
                shortlisted_by: userId,
            },
        });
    }
    async unshortlist(id) {
        return this.prisma.application.update({
            where: { id },
            data: {
                shortlisted: false,
                shortlisted_at: null,
                shortlisted_by: null,
            },
        });
    }
    async updateStage(id, stage) {
        return this.prisma.application.update({
            where: { id },
            data: { stage },
        });
    }
    async updateNotes(id, notes) {
        return this.prisma.application.update({
            where: { id },
            data: { recruiter_notes: notes },
        });
    }
    async countByJobId(jobId) {
        return this.prisma.application.count({
            where: { job_id: jobId },
        });
    }
    async countUnreadByJobId(jobId) {
        return this.prisma.application.count({
            where: {
                job_id: jobId,
                is_read: false,
            },
        });
    }
    async markAsRead(id) {
        return this.prisma.application.update({
            where: { id },
            data: {
                is_read: true,
                is_new: false,
            },
        });
    }
    async checkExistingApplication(candidateId, jobId) {
        const count = await this.prisma.application.count({
            where: {
                candidate_id: candidateId,
                job_id: jobId,
            },
        });
        return count > 0;
    }
    async upsertRoundProgress(applicationId, jobRoundId) {
        await this.prisma.applicationRoundProgress.upsert({
            where: {
                application_id_job_round_id: {
                    application_id: applicationId,
                    job_round_id: jobRoundId,
                },
            },
            create: {
                application_id: applicationId,
                job_round_id: jobRoundId,
                completed: false,
                updated_at: new Date(),
            },
            update: {
                completed: false,
                completed_at: null,
                updated_at: new Date(),
            },
        });
    }
    // Helper to find round (should be in JobRoundRepository ideally but adding here for safe access)
    async findJobRound(id) {
        return this.prisma.jobRound.findUnique({ where: { id } });
    }
    async findJobRoundByFixedKey(jobId, fixedKey) {
        return this.prisma.jobRound.findFirst({
            where: {
                job_id: jobId,
                fixed_key: fixedKey,
            },
        });
    }
    async bulkUpdateScore(applicationIds, scores) {
        // Update scores in a transaction
        const updatePromises = applicationIds.map((id) => this.prisma.application.update({
            where: { id },
            data: { score: scores[id] },
        }));
        const results = await this.prisma.$transaction(updatePromises);
        return results.length;
    }
    async saveScreeningResult(data) {
        await this.prisma.screeningResult.create({
            data: {
                application_id: data.applicationId,
                screening_type: data.screeningType,
                status: data.status,
                score: data.score,
                criteria_matched: data.criteriaMatched,
                reviewed_by: data.reviewedBy,
            },
        });
    }
    async findResumeByUrl(url) {
        return this.prisma.candidateResume.findFirst({
            where: { file_url: url },
        });
    }
    async updateResumeContent(id, content) {
        return this.prisma.candidateResume.update({
            where: { id },
            data: { content }
        });
    }
    async addEvaluation(data) {
        // Upsert evaluation: One user can only have one evaluation per application (or update their existing one)
        return this.prisma.candidateEvaluation.upsert({
            where: {
                application_id_user_id: {
                    application_id: data.applicationId,
                    user_id: data.userId,
                },
            },
            create: {
                application_id: data.applicationId,
                user_id: data.userId,
                score: data.score,
                comment: data.comment,
                decision: data.decision,
            },
            update: {
                score: data.score,
                comment: data.comment,
                decision: data.decision,
            },
        });
    }
    async getEvaluations(applicationId) {
        return this.prisma.candidateEvaluation.findMany({
            where: { application_id: applicationId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        role: true, // Helpful for frontend to distinguish Admin/Member
                    },
                },
            },
            orderBy: { updated_at: 'desc' },
        });
    }
}
exports.ApplicationRepository = ApplicationRepository;
