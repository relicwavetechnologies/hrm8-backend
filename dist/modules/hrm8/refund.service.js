"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundService = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
class RefundService extends service_1.BaseService {
    constructor(refundRepository) {
        super();
        this.refundRepository = refundRepository;
    }
    async getAll(filters) {
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.companyId)
            where.company_id = filters.companyId;
        return this.refundRepository.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });
    }
    async getById(id) {
        const request = await this.refundRepository.findUnique(id);
        if (!request)
            throw new http_exception_1.HttpException(404, 'Refund request not found');
        return request;
    }
    async approve(id, adminId, adminNotes) {
        const request = await this.getById(id);
        if (request.status !== 'PENDING') {
            throw new http_exception_1.HttpException(400, `Refund request cannot be approved in ${request.status} status`);
        }
        return this.refundRepository.update(id, {
            status: 'APPROVED',
            processed_by: adminId,
            processed_at: new Date(),
            admin_notes: adminNotes,
        });
    }
    async reject(id, adminId, rejectionReason) {
        const request = await this.getById(id);
        if (request.status !== 'PENDING') {
            throw new http_exception_1.HttpException(400, `Refund request cannot be rejected in ${request.status} status`);
        }
        return this.refundRepository.update(id, {
            status: 'REJECTED',
            rejected_by: adminId,
            rejected_at: new Date(),
            rejection_reason: rejectionReason,
        });
    }
    async complete(id, paymentReference) {
        const request = await this.getById(id);
        if (request.status !== 'APPROVED') {
            throw new http_exception_1.HttpException(400, `Refund request must be APPROVED before completing`);
        }
        return this.refundRepository.update(id, {
            status: 'COMPLETED',
            refund_completed_at: new Date(),
            payment_reference: paymentReference,
        });
    }
}
exports.RefundService = RefundService;
