import { BaseService } from '../../core/service';
import { SignupRequestRepository } from './signup-request.repository';
import { AuthRepository } from './auth.repository';
import { HttpException } from '../../core/http-exception';
import { emailService } from '../email/email.service';

export class SignupRequestService extends BaseService {
    constructor(
        private signupRequestRepository: SignupRequestRepository,
        private authRepository: AuthRepository
    ) {
        super();
    }

    async getPendingRequests(companyId: string) {
        return this.signupRequestRepository.findMany({
            company_id: companyId,
            status: 'PENDING',
        });
    }

    async getAllRequests(companyId: string) {
        return this.signupRequestRepository.findMany({
            company_id: companyId,
        });
    }

    async approveRequest(requestId: string, reviewerId: string) {
        const request = await this.signupRequestRepository.findById(requestId);
        if (!request) throw new HttpException(404, 'Signup request not found');
        if (request.status !== 'PENDING') throw new HttpException(400, `Request is already ${request.status.toLowerCase()}`);

        // Update request status
        await this.signupRequestRepository.update(requestId, {
            status: 'APPROVED',
            reviewer: { connect: { id: reviewerId } },
            reviewed_at: new Date(),
        });

        // Create user
        const user = await this.authRepository.create({
            email: request.email,
            name: request.name,
            password_hash: request.password_hash,
            company: { connect: { id: request.company_id } },
            role: 'USER',
            status: 'ACTIVE',
        });

        // Notify user
        try {
            await emailService.sendNotificationEmail(
                request.email,
                'Access Approved!',
                `Your request to join your company on HRM8 has been approved. You can now log in with your email and the password you set during signup.`,
                '/login'
            );
        } catch (error) {
            console.error('[SignupRequestService.approveRequest] Failed to notify user:', error);
        }

        return {
            signupRequest: request,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            message: 'Signup request approved successfully.',
        };
    }

    async rejectRequest(requestId: string, reviewerId: string, reason?: string) {
        const request = await this.signupRequestRepository.findById(requestId);
        if (!request) throw new HttpException(404, 'Signup request not found');
        if (request.status !== 'PENDING') throw new HttpException(400, `Request is already ${request.status.toLowerCase()}`);

        await this.signupRequestRepository.update(requestId, {
            status: 'REJECTED',
            reviewer: { connect: { id: reviewerId } },
            reviewed_at: new Date(),
            rejection_reason: reason,
        });

        // Notify user
        try {
            await emailService.sendNotificationEmail(
                request.email,
                'Access Request Update',
                `Your request to join your company on HRM8 has been reviewed${reason ? `. Reason: ${reason}` : ' and unfortunately could not be approved at this time.'}`
            );
        } catch (error) {
            console.error('[SignupRequestService.rejectRequest] Failed to notify user:', error);
        }

        return {
            signupRequest: request,
            message: 'Signup request rejected.',
        };
    }
}
