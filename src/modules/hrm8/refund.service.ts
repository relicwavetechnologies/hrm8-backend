import { BaseService } from '../../core/service';
import { RefundRepository } from './refund.repository';
import { HttpException } from '../../core/http-exception';
import { prisma } from '../../utils/prisma';
import { RefundStatus } from '@prisma/client';

export class RefundService extends BaseService {
    constructor(private refundRepository: RefundRepository) {
        super();
    }

    async getAll(filters: { status?: RefundStatus; companyId?: string }) {
        const where: any = {};
        if (filters.status) where.status = filters.status;
        if (filters.companyId) where.company_id = filters.companyId;

        return this.refundRepository.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });
    }

    async getById(id: string) {
        const request = await this.refundRepository.findUnique(id);
        if (!request) throw new HttpException(404, 'Refund request not found');
        return request;
    }

    async approve(id: string, adminId: string, adminNotes?: string) {
        const request = await this.getById(id);
        if (request.status !== 'PENDING') {
            throw new HttpException(400, `Refund request cannot be approved in ${request.status} status`);
        }

        return this.refundRepository.update(id, {
            status: 'APPROVED',
            processed_by: adminId,
            processed_at: new Date(),
            admin_notes: adminNotes,
        });
    }

    async reject(id: string, adminId: string, rejectionReason: string) {
        const request = await this.getById(id);
        if (request.status !== 'PENDING') {
            throw new HttpException(400, `Refund request cannot be rejected in ${request.status} status`);
        }

        return this.refundRepository.update(id, {
            status: 'REJECTED',
            rejected_by: adminId,
            rejected_at: new Date(),
            rejection_reason: rejectionReason,
        });
    }

    async complete(id: string, paymentReference: string) {
        const request = await this.getById(id);
        if (request.status !== 'APPROVED') {
            throw new HttpException(400, `Refund request must be APPROVED before completing`);
        }

        return this.refundRepository.update(id, {
            status: 'COMPLETED',
            refund_completed_at: new Date(),
            payment_reference: paymentReference,
        });
    }
}
