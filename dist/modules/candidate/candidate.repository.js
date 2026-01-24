"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateRepository = void 0;
const repository_1 = require("../../core/repository");
class CandidateRepository extends repository_1.BaseRepository {
    // Auth Methods
    async create(data) {
        return this.prisma.candidate.create({
            data,
        });
    }
    async createVerificationToken(data) {
        return this.prisma.candidateVerificationToken.create({
            data,
        });
    }
    async findVerificationToken(token) {
        return this.prisma.candidateVerificationToken.findUnique({
            where: { token },
            include: { candidate: true },
        });
    }
    async deleteVerificationToken(id) {
        return this.prisma.candidateVerificationToken.delete({
            where: { id },
        });
    }
    async createSession(data) {
        return this.prisma.candidateSession.create({
            data,
        });
    }
    async deleteSession(sessionId) {
        return this.prisma.candidateSession.delete({
            where: { session_id: sessionId },
        });
    }
    async findByEmail(email) {
        return this.prisma.candidate.findUnique({
            where: { email },
        });
    }
    async findById(id) {
        return this.prisma.candidate.findUnique({
            where: { id },
        });
    }
    async updatePassword(id, passwordHash) {
        return this.prisma.candidate.update({
            where: { id },
            data: { password_hash: passwordHash },
        });
    }
    async verifyEmail(id) {
        return this.prisma.candidate.update({
            where: { id },
            data: { email_verified: true },
        });
    }
    async update(id, data) {
        return this.prisma.candidate.update({
            where: { id },
            data
        });
    }
    // Work Experience Methods
    async getWorkHistory(candidateId) {
        return this.prisma.candidateWorkExperience.findMany({
            where: { candidate_id: candidateId },
            orderBy: { start_date: 'desc' },
        });
    }
    async addWorkExperience(data) {
        return this.prisma.candidateWorkExperience.create({
            data,
        });
    }
    async updateWorkExperience(id, candidateId, data) {
        return this.prisma.candidateWorkExperience.update({
            where: { id }, // id is unique globally
            data,
        });
    }
    async deleteWorkExperience(id) {
        return this.prisma.candidateWorkExperience.delete({
            where: { id },
        });
    }
    async findWorkExperienceById(id) {
        return this.prisma.candidateWorkExperience.findUnique({
            where: { id },
        });
    }
    async deleteAllWorkExperience(candidateId) {
        return this.prisma.candidateWorkExperience.deleteMany({
            where: { candidate_id: candidateId },
        });
    }
    // Skills Methods
    async getSkills(candidateId) {
        return this.prisma.candidateSkill.findMany({
            where: { candidate_id: candidateId },
            orderBy: { name: 'asc' },
        });
    }
    async updateSkills(candidateId, skills) {
        return this.prisma.$transaction(async (tx) => {
            // Delete existing skills
            await tx.candidateSkill.deleteMany({
                where: { candidate_id: candidateId },
            });
            // Create new skills
            if (skills.length > 0) {
                await tx.candidateSkill.createMany({
                    data: skills.map((skill) => ({
                        candidate_id: candidateId,
                        name: skill.name,
                        level: skill.level,
                    })),
                });
            }
            return await tx.candidateSkill.findMany({
                where: { candidate_id: candidateId },
            });
        });
    }
    async deleteAllSkills(candidateId) {
        return this.prisma.candidateSkill.deleteMany({
            where: { candidate_id: candidateId },
        });
    }
    // Data Export Helper
    async getFullProfile(candidateId) {
        const [profile, workHistory, skills, education, certifications, training, resumes, coverLetters, portfolio,] = await Promise.all([
            this.findById(candidateId),
            this.getWorkHistory(candidateId),
            this.getSkills(candidateId),
            this.prisma.candidateEducation.findMany({ where: { candidate_id: candidateId } }),
            this.prisma.candidateCertification.findMany({ where: { candidate_id: candidateId } }),
            this.prisma.candidateTraining.findMany({ where: { candidate_id: candidateId } }),
            this.prisma.candidateResume.findMany({ where: { candidate_id: candidateId } }),
            this.prisma.candidateCoverLetter.findMany({ where: { candidate_id: candidateId } }),
            this.prisma.candidatePortfolio.findMany({ where: { candidate_id: candidateId } }),
        ]);
        return {
            profile,
            workHistory,
            skills,
            education,
            certifications,
            training,
            documents: {
                resumes,
                coverLetters,
                portfolio,
            },
        };
    }
    // Account Deletion
    async deleteAccount(candidateId) {
        return this.prisma.$transaction(async (tx) => {
            // Delete dependent data
            await tx.candidateWorkExperience.deleteMany({ where: { candidate_id: candidateId } });
            await tx.candidateSkill.deleteMany({ where: { candidate_id: candidateId } });
            await tx.candidateEducation.deleteMany({ where: { candidate_id: candidateId } });
            await tx.candidateCertification.deleteMany({ where: { candidate_id: candidateId } });
            await tx.candidateTraining.deleteMany({ where: { candidate_id: candidateId } });
            await tx.candidateResume.deleteMany({ where: { candidate_id: candidateId } });
            await tx.candidateCoverLetter.deleteMany({ where: { candidate_id: candidateId } });
            await tx.candidatePortfolio.deleteMany({ where: { candidate_id: candidateId } });
            await tx.jobAlert.deleteMany({ where: { candidate_id: candidateId } });
            await tx.savedJob.deleteMany({ where: { candidate_id: candidateId } });
            await tx.savedSearch.deleteMany({ where: { candidate_id: candidateId } });
            await tx.candidateSession.deleteMany({ where: { candidate_id: candidateId } });
            // Delete the candidate
            return await tx.candidate.delete({
                where: { id: candidateId },
            });
        });
    }
    // Session Methods
    async findSessionBySessionId(sessionId) {
        return this.prisma.candidateSession.findUnique({
            where: { session_id: sessionId },
            include: { candidate: true },
        });
    }
}
exports.CandidateRepository = CandidateRepository;
