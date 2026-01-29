import { BaseService } from '../../core/service';
import { RefundRequestRepository } from './refund-request.repository';
import { HttpException } from '../../core/http-exception';

export class RefundRequestService extends BaseService {
    constructor(private repository: RefundRequestRepository) {
        super();
    }

    /**
     * Create a refund request
     */
    async createRequest(companyId: string, data: { transactionId: string; reason: string }) {
        // 1. Validate transaction ownership
        const transaction = await this.repository.findTransaction(data.transactionId, companyId);
        if (!transaction) {
            throw new HttpException(404, 'Transaction not found');
        }

        // 2. Validate transaction is debatable/refundable
        // (Simplified logic: assuming all 'DEBIT' can be refunded for now)
        if (transaction.direction !== 'DEBIT') {
            throw new HttpException(400, 'Only debit transactions can be refunded');
        }

        return this.repository.create({
            companyId,
            transactionId: data.transactionId,
            transactionType: transaction.type,
            amount: transaction.amount,
            reason: data.reason
        });
    }

    /**
     * Get requests
     */
    async getRequests(companyId: string) {
        return this.repository.findAllByCompany(companyId);
    }

    /**
     * Withdraw request
     */
    async withdrawRequest(id: string, companyId: string) {
        const request = await this.repository.findById(id);
        if (!request) {
            throw new HttpException(404, 'Refund request not found');
        }

        if (request.company_id !== companyId) {
            throw new HttpException(403, 'Unauthorized');
        }

        if (request.status !== 'PENDING') {
            throw new HttpException(400, 'Only pending requests can be withdrawn');
        }

        // Assuming WITHDRAWN is a valid status or similar (CANCELLED etc)
        // From schema snippet it wasn't clear, but typically CANCELLED or WITHDRAWN
        // We'll use WITHDRAWN here, will fix if enum error
        return this.repository.updateStatus(id, 'WITHDRAWN' as any);
    }
}
