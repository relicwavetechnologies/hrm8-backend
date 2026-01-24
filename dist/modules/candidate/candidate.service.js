"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateService = void 0;
const service_1 = require("../../core/service");
const password_1 = require("../../utils/password");
const http_exception_1 = require("../../core/http-exception");
const email_service_1 = require("../email/email.service");
const session_1 = require("../../utils/session");
const crypto_1 = require("crypto");
class CandidateService extends service_1.BaseService {
    constructor(candidateRepository) {
        super();
        this.candidateRepository = candidateRepository;
    }
    // Auth Methods
    async register(data) {
        const existing = await this.candidateRepository.findByEmail(data.email);
        if (existing) {
            throw new http_exception_1.HttpException(409, 'Email already exists');
        }
        if (!(0, password_1.isPasswordStrong)(data.password)) {
            throw new http_exception_1.HttpException(400, 'Password is too weak');
        }
        const passwordHash = await (0, password_1.hashPassword)(data.password);
        const candidate = await this.candidateRepository.create({
            email: data.email,
            password_hash: passwordHash,
            first_name: data.firstName,
            last_name: data.lastName,
            status: 'PENDING_VERIFICATION',
            email_verified: false,
        });
        // Create verification token
        const token = (0, crypto_1.randomUUID)();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        await this.candidateRepository.createVerificationToken({
            candidate: { connect: { id: candidate.id } },
            email: candidate.email,
            token,
            expires_at: expiresAt,
        });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
        await email_service_1.emailService.sendCandidateVerificationEmail({
            to: candidate.email,
            name: `${candidate.first_name} ${candidate.last_name}`,
            verificationUrl,
        });
        return { candidate, verificationToken: token };
    }
    async login(data) {
        const candidate = await this.candidateRepository.findByEmail(data.email);
        if (!candidate) {
            throw new http_exception_1.HttpException(401, 'Invalid credentials');
        }
        const isValid = await (0, password_1.comparePassword)(data.password, candidate.password_hash);
        if (!isValid) {
            throw new http_exception_1.HttpException(401, 'Invalid credentials');
        }
        if (candidate.status === 'INACTIVE') {
            throw new http_exception_1.HttpException(403, 'Account is inactive');
        }
        const sessionId = (0, session_1.generateSessionId)();
        const expiresAt = (0, session_1.getSessionExpiration)();
        await this.candidateRepository.createSession({
            session_id: sessionId,
            candidate: { connect: { id: candidate.id } },
            email: candidate.email,
            expires_at: expiresAt,
        });
        return { candidate, sessionId };
    }
    async verifyEmail(token) {
        const verificationToken = await this.candidateRepository.findVerificationToken(token);
        if (!verificationToken) {
            throw new http_exception_1.HttpException(400, 'Invalid token');
        }
        if (verificationToken.expires_at < new Date()) {
            throw new http_exception_1.HttpException(400, 'Token expired');
        }
        // Update candidate status
        await this.candidateRepository.verifyEmail(verificationToken.candidate_id);
        // Delete token to prevent reuse
        await this.candidateRepository.deleteVerificationToken(verificationToken.id);
        // Create session for auto login
        const sessionId = (0, session_1.generateSessionId)();
        const expiresAt = (0, session_1.getSessionExpiration)();
        await this.candidateRepository.createSession({
            session_id: sessionId,
            candidate: { connect: { id: verificationToken.candidate_id } },
            email: verificationToken.email,
            expires_at: expiresAt,
        });
        return { candidate: verificationToken.candidate, sessionId };
    }
    async logout(sessionId) {
        await this.candidateRepository.deleteSession(sessionId);
    }
    async getProfile(id) {
        const candidate = await this.candidateRepository.findById(id);
        if (!candidate) {
            throw new http_exception_1.HttpException(404, 'Candidate not found');
        }
        return candidate;
    }
    async updateProfile(id, data) {
        const candidate = await this.candidateRepository.findById(id);
        if (!candidate) {
            throw new http_exception_1.HttpException(404, 'Candidate not found');
        }
        // Map fields if necessary. 
        // In the legacy code, the request keys seem to match the model fields or were manually mapped.
        // The prisma schema uses snake_case for DB columns but the generated client maps them to camelCase or keeps them as is depending on @map.
        // Looking at schema.prisma:
        // first_name -> firstName (mapped?) No, it says @map("first_name") but the field name in model is `first_name`.
        // Wait, let's check the schema again.
        // model Candidate {
        //   first_name String @map("first_name")
        // }
        // This means the Prisma Client property is `first_name`.
        // BUT usually in JS/TS we want camelCase.
        // The legacy code used `firstName`.
        // If I pass `firstName` to `this.candidateRepository.update`, it will fail if the Prisma Client expects `first_name`.
        // I need to map camelCase to snake_case for the repository call if the repository uses strict Prisma types.
        // Let's check `candidate.repository.ts`. It extends `BaseRepository<Candidate>`.
        // `Candidate` type from `@prisma/client` will have the property names as defined in the `model` block (left side).
        // In the schema I read:
        // model Candidate {
        //   first_name               String                       @map("first_name")
        // }
        // So the property on the object is `first_name`.
        // The input `UpdateCandidateProfileRequest` uses camelCase (firstName).
        // So I need to map it.
        const updateData = {};
        if (data.firstName)
            updateData.first_name = data.firstName;
        if (data.lastName)
            updateData.last_name = data.lastName;
        if (data.phone)
            updateData.phone = data.phone;
        if (data.photo)
            updateData.photo = data.photo;
        if (data.linkedInUrl)
            updateData.linked_in_url = data.linkedInUrl;
        if (data.city)
            updateData.city = data.city;
        if (data.state)
            updateData.state = data.state;
        if (data.country)
            updateData.country = data.country;
        if (data.visaStatus)
            updateData.visa_status = data.visaStatus;
        if (data.workEligibility)
            updateData.work_eligibility = data.workEligibility;
        if (data.jobTypePreference)
            updateData.job_type_preference = data.jobTypePreference;
        if (data.salaryPreference)
            updateData.salary_preference = data.salaryPreference;
        if (data.relocationWilling !== undefined)
            updateData.relocation_willing = data.relocationWilling;
        if (data.remotePreference)
            updateData.remote_preference = data.remotePreference;
        if (data.resumeUrl)
            updateData.resume_url = data.resumeUrl;
        return this.candidateRepository.update(id, updateData);
    }
    async updatePassword(id, currentPassword, newPassword) {
        const candidate = await this.candidateRepository.findById(id);
        if (!candidate) {
            throw new http_exception_1.HttpException(404, 'Candidate not found');
        }
        const isValid = await (0, password_1.comparePassword)(currentPassword, candidate.password_hash);
        if (!isValid) {
            throw new http_exception_1.HttpException(400, 'Current password is incorrect');
        }
        if (!(0, password_1.isPasswordStrong)(newPassword)) {
            throw new http_exception_1.HttpException(400, 'Password must be at least 8 characters with uppercase, lowercase, and number');
        }
        const newPasswordHash = await (0, password_1.hashPassword)(newPassword);
        await this.candidateRepository.updatePassword(id, newPasswordHash);
    }
    async exportCandidateData(id) {
        const candidate = await this.candidateRepository.findById(id);
        if (!candidate) {
            throw new http_exception_1.HttpException(404, 'Candidate not found');
        }
        return this.candidateRepository.getFullProfile(id);
    }
    async deleteAccount(id, password) {
        const candidate = await this.candidateRepository.findById(id);
        if (!candidate) {
            throw new http_exception_1.HttpException(404, 'Candidate not found');
        }
        if (password) {
            const isValid = await (0, password_1.comparePassword)(password, candidate.password_hash);
            if (!isValid) {
                throw new http_exception_1.HttpException(401, 'Incorrect password');
            }
        }
        await this.candidateRepository.deleteAccount(id);
    }
    // Work Experience
    async getWorkHistory(candidateId) {
        return this.candidateRepository.getWorkHistory(candidateId);
    }
    async addWorkExperience(candidateId, data) {
        // Map data
        const workData = {
            candidate: { connect: { id: candidateId } },
            company: data.company,
            role: data.role,
            start_date: new Date(data.startDate || data.start_date),
            end_date: data.endDate || data.end_date ? new Date(data.endDate || data.end_date) : null,
            current: data.current || false,
            description: data.description,
            location: data.location,
        };
        return this.candidateRepository.addWorkExperience(workData);
    }
    async updateWorkExperience(candidateId, experienceId, data) {
        // Verify ownership
        const experience = await this.candidateRepository.findWorkExperienceById(experienceId);
        if (!experience || experience.candidate_id !== candidateId) {
            throw new http_exception_1.HttpException(404, 'Work experience not found');
        }
        const updateData = { ...data };
        if (data.startDate) {
            updateData.start_date = new Date(data.startDate);
            delete updateData.startDate;
        }
        if (data.endDate) {
            updateData.end_date = new Date(data.endDate);
            delete updateData.endDate;
        }
        // Remove id from data if present to avoid "Unknown arg" error if it's not in update input
        delete updateData.id;
        delete updateData.candidateId;
        return this.candidateRepository.updateWorkExperience(experienceId, candidateId, updateData);
    }
    async deleteWorkExperience(candidateId, experienceId) {
        const experience = await this.candidateRepository.findWorkExperienceById(experienceId);
        if (!experience || experience.candidate_id !== candidateId) {
            throw new http_exception_1.HttpException(404, 'Work experience not found');
        }
        await this.candidateRepository.deleteWorkExperience(experienceId);
    }
    // Skills
    async getSkills(candidateId) {
        return this.candidateRepository.getSkills(candidateId);
    }
    async updateSkills(candidateId, skills) {
        return this.candidateRepository.updateSkills(candidateId, skills);
    }
}
exports.CandidateService = CandidateService;
