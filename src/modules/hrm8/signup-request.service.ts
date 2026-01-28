import { BaseService } from '../../core/service';
import { SignupRequestRepository } from './signup-request.repository';
import { SignupRequestStatus } from '@prisma/client';
import { HttpException } from '../../core/http-exception';

export class SignupRequestService extends BaseService {
    constructor(private repo: SignupRequestRepository) {
        super();
    }

    async getRequests(status?: SignupRequestStatus) {
        return this.repo.findAll(status);
    }

    async getRequestById(id: string) {
        const request = await this.repo.findById(id);
        if (!request) throw new HttpException(404, 'Signup request not found');
        return request;
    }

    async approveRequest(id: string, adminId: string, notes?: string) {
        // Logic: Approve request -> potentially create Company/User/Consultant
        // For now, just update status
        return this.repo.updateStatus(id, 'APPROVED', adminId, notes);
    }

    async rejectRequest(id: string, adminId: string, notes?: string) {
        return this.repo.updateStatus(id, 'REJECTED', adminId, notes);
    }
}
