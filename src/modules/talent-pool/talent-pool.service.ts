import { BaseService } from '../../core/service';
import { TalentPoolRepository } from './talent-pool.repository';
import { HttpException } from '../../core/http-exception';
import { SearchTalentRequest, InviteCandidateRequest, BulkInviteRequest } from './talent-pool.types';
import { JobInvitationStatus } from '../../types';
import crypto from 'crypto';
import { env } from '../../config/env';
// import { emailService } from '../email/email.service'; // Mocking email service for now

export class TalentPoolService extends BaseService {
    constructor(private repository: TalentPoolRepository) {
        super();
    }

    /**
     * Search Talent
     */
    async search(filters: SearchTalentRequest) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;

        const { candidates, total } = await this.repository.searchCandidates({
            ...filters,
            skip,
            limit,
        });

        return {
            candidates, // We might want to map this to a safer DTO later
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Invite Candidate to Job
     */
    async inviteCandidate(data: InviteCandidateRequest, inviterId: string) {
        const { jobId, email, name, message } = data;

        // 1. Check if already invited
        const existing = await this.repository.findInvitation(jobId, email);
        if (existing) {
            // If expired, maybe allow re-invite? For now, just error.
            throw new HttpException(400, 'Candidate already invited to this job');
        }

        // 2. Create Token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        // 3. Create Invitation
        const invitation = await this.repository.createInvitation({
            email,
            token,
            status: JobInvitationStatus.PENDING,
            expires_at: expiresAt,
            job: { connect: { id: jobId } },
            inviter: { connect: { id: inviterId } },
            // If candidateId provided, connect it
            ...(data.candidateId ? { candidate: { connect: { id: data.candidateId } } } : {}),
            // If we don't have candidateId, we rely on email. 
            // If email matches existing candidate, should we connect automatically? 
            // Ideally yes, but let's stick to explicit candidateId if provided.
        });

        // 4. Send Email (Mock)
        const inviteLink = `${env.FRONTEND_URL}/job-invite/${token}`;
        console.log(`[Email Mock] Sending Job Invite to ${email}: ${inviteLink}`);
        // await emailService.sendJobInvitation(email, inviteLink, message);

        return invitation;
    }

    /**
     * Bulk Invite Candidates
     */
    async bulkInviteCandidates(data: BulkInviteRequest, inviterId: string) {
        const results = [];
        const errors = [];

        for (const candidate of data.candidates) {
            try {
                const invitation = await this.inviteCandidate({
                    jobId: data.jobId,
                    candidateId: candidate.candidateId,
                    email: candidate.email,
                    name: candidate.name,
                    message: data.message
                }, inviterId);
                results.push(invitation);
            } catch (error) {
                errors.push({
                    email: candidate.email,
                    error: error instanceof Error ? error.message : 'Failed to invite'
                });
            }
        }

        return {
            invitedCount: results.length,
            errorCount: errors.length,
            results,
            errors
        };
    }

    /**
     * Get Invitation by Token
     */
    async getInvitation(token: string) {
        const invitation = await this.repository.findInvitationByToken(token);
        if (!invitation) {
            throw new HttpException(404, 'Invalid or expired invitation link');
        }

        if (new Date() > invitation.expires_at) {
            throw new HttpException(400, 'Invitation has expired');
        }

        return invitation;
    }

    /**
     * Get Candidate Details
     */
    async getCandidate(candidateId: string) {
        const candidate = await this.repository.findCandidateById(candidateId);
        if (!candidate) {
            throw new HttpException(404, 'Candidate not found');
        }

        // Map to response DTO
        return {
            id: candidate.id,
            firstName: candidate.first_name,
            lastName: candidate.last_name,
            email: candidate.email,
            phone: candidate.phone || undefined,
            city: candidate.city || undefined,
            state: candidate.state || undefined,
            country: candidate.country || undefined,
            photo: candidate.photo || undefined,
            title: candidate.work_experience?.[0]?.role, // Most recent role as title
            skills: candidate.skills?.map(s => s.name) || [],
            experience: candidate.work_experience?.map(exp => ({
                id: exp.id,
                company: exp.company,
                role: exp.role,
                startDate: exp.start_date,
                endDate: exp.end_date,
                current: exp.current,
                description: exp.description,
                location: exp.location,
            })) || [],
            education: candidate.education?.map(edu => ({
                id: edu.id,
                institution: edu.institution,
                degree: edu.degree,
                field: edu.field,
                startDate: edu.start_date,
                endDate: edu.end_date,
                current: edu.current,
            })) || [],
            resumeUrl: candidate.resumes?.[0]?.file_url,
            createdAt: candidate.created_at,
            updatedAt: candidate.updated_at,
        };
    }

    /**
     * Get Candidate Resume
     */
    async getCandidateResume(candidateId: string) {
        const resume = await this.repository.findCandidateResume(candidateId);

        if (!resume) {
            throw new HttpException(404, 'No resume found for this candidate');
        }

        return {
            url: resume.file_url,
            filename: resume.file_name,
            type: resume.file_type,
            size: resume.file_size
        };
    }
}
