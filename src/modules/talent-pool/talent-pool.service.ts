import { BaseService } from '../../core/service';
import { TalentPoolRepository } from './talent-pool.repository';
import { HttpException } from '../../core/http-exception';
import { SearchTalentRequest, InviteCandidateRequest } from './talent-pool.types';
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
}
