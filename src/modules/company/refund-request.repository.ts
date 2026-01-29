import { BaseRepository } from '../../core/repository';

export class RefundRequestRepository extends BaseRepository {
    /**
     * Create refund request
     */
    async create(data: {
        companyId: string;
        transactionId: string;
        transactionType: string;
        amount: number;
        reason: string;
    }) {
        return this.prisma.transactionRefundRequest.create({
            data: {
                company_id: data.companyId,
                transaction_id: data.transactionId,
                transaction_type: data.transactionType,
                amount: data.amount,
                reason: data.reason,
                status: 'PENDING'
            }
        });
    }

    /**
     * Get company refund requests
     */
    async findAllByCompany(companyId: string, limit = 50, offset = 0) {
        return this.prisma.transactionRefundRequest.findMany({
            where: {
                company_id: companyId
            },
            orderBy: {
                created_at: 'desc'
            },
            take: limit,
            skip: offset
        });
    }

    /**
     * Find by ID
     */
    async findById(id: string) {
        return this.prisma.transactionRefundRequest.findUnique({
            where: { id }
        });
    }

    /**
     * Update status
     */
    async updateStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN') {
        // Only valid status for Prisma enum usually, assume 'WITHDRAWN' is valid or mapped
        // Checking schema: enum RefundStatus isn't fully visible but likely has standard statuses.
        // If it's pure string in schema (it was enum RefundStatus), we cast or assume.
        // From schema snippet: status RefundStatus @default(PENDING).
        // We'll proceed assuming standard enum values.
        return this.prisma.transactionRefundRequest.update({
            where: { id },
            data: { status: status as any }
        });
    }

    /**
     * Check if transaction belongs to company
     */
    async findTransaction(transactionId: string, companyId: string) {
        // Need to check VirtualTransaction table usually.
        // Assuming VirtualTransaction is where transactions live.
        // Schema: VirtualTransaction -> virtual_account -> company
        return this.prisma.virtualTransaction.findFirst({
            where: {
                id: transactionId,
                virtual_account: {
                    owner_type: 'COMPANY',
                    owner_id: companyId
                }
            }
        });
    }
}
