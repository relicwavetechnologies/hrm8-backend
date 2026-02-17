"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignupRequestService = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
const email_service_1 = require("../email/email.service");
class SignupRequestService extends service_1.BaseService {
    constructor(signupRequestRepository, authRepository) {
        super();
        this.signupRequestRepository = signupRequestRepository;
        this.authRepository = authRepository;
    }
    async getPendingRequests(companyId) {
        return this.signupRequestRepository.findMany({
            company_id: companyId,
            status: 'PENDING',
        });
    }
    async getAllRequests(companyId) {
        return this.signupRequestRepository.findMany({
            company_id: companyId,
        });
    }
    async approveRequest(requestId, reviewerId) {
        const request = await this.signupRequestRepository.findById(requestId);
        if (!request)
            throw new http_exception_1.HttpException(404, 'Signup request not found');
        if (request.status !== 'PENDING')
            throw new http_exception_1.HttpException(400, `Request is already ${request.status.toLowerCase()}`);
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
            await email_service_1.emailService.sendNotificationEmail(request.email, 'Access Approved!', `Your request to join your company on HRM8 has been approved. You can now log in with your email and the password you set during signup.`, '/login');
        }
        catch (error) {
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
    async rejectRequest(requestId, reviewerId, reason) {
        const request = await this.signupRequestRepository.findById(requestId);
        if (!request)
            throw new http_exception_1.HttpException(404, 'Signup request not found');
        if (request.status !== 'PENDING')
            throw new http_exception_1.HttpException(400, `Request is already ${request.status.toLowerCase()}`);
        await this.signupRequestRepository.update(requestId, {
            status: 'REJECTED',
            reviewer: { connect: { id: reviewerId } },
            reviewed_at: new Date(),
            rejection_reason: reason,
        });
        // Notify user
        try {
            await email_service_1.emailService.sendNotificationEmail(request.email, 'Access Request Update', `Your request to join your company on HRM8 has been reviewed${reason ? `. Reason: ${reason}` : ' and unfortunately could not be approved at this time.'}`);
        }
        catch (error) {
            console.error('[SignupRequestService.rejectRequest] Failed to notify user:', error);
        }
        return {
            signupRequest: request,
            message: 'Signup request rejected.',
        };
    }
}
exports.SignupRequestService = SignupRequestService;
