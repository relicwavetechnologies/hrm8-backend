"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionService = void 0;
const service_1 = require("../../core/service");
const client_1 = require("@prisma/client");
const http_exception_1 = require("../../core/http-exception");
const prisma_1 = require("../../utils/prisma");
class CommissionService extends service_1.BaseService {
    constructor(commissionRepository) {
        super();
        this.commissionRepository = commissionRepository;
    }
    mapToDTO(commission) {
        return {
            id: commission.id,
            consultantId: commission.consultant_id,
            regionId: commission.region_id,
            jobId: commission.job_id,
            subscriptionId: commission.subscription_id,
            type: commission.type,
            amount: commission.amount,
            description: commission.description,
            status: commission.status,
            createdAt: commission.created_at,
            confirmedAt: commission.confirmed_at,
            paidAt: commission.paid_at,
            consultant: commission.consultant ? {
                id: commission.consultant.id,
                firstName: commission.consultant.first_name,
                lastName: commission.consultant.last_name,
                email: commission.consultant.email
            } : undefined
        };
    }
    async getAll(params) {
        const { limit = 50, offset = 0, consultantId } = params;
        const where = {};
        if (consultantId)
            where.consultant_id = consultantId;
        const [commissions, total] = await Promise.all([
            this.commissionRepository.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { created_at: 'desc' },
                include: { consultant: true }
            }),
            this.commissionRepository.count(where),
        ]);
        return { commissions: commissions.map(c => this.mapToDTO(c)), total };
    }
    async getById(id) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission)
            throw new http_exception_1.HttpException(404, 'Commission not found');
        return this.mapToDTO(commission);
    }
    /**
     * Award commission based on regional pricing
     * Calculates commission from job/subscription payment amount
     */
    async awardCommissionForPayment(consultantId, type, jobId, subscriptionId, customRate) {
        return this.create({
            consultantId,
            type,
            jobId,
            subscriptionId,
            calculateFromJob: true,
            rate: customRate,
        });
    }
    async create(input) {
        const { consultantId, amount: providedAmount, type, jobId, subscriptionId, description, rate, calculateFromJob = false } = input;
        // Calculate amount if needed
        let amount = providedAmount;
        let commissionCurrency = 'USD';
        let commissionRate = rate;
        if (calculateFromJob && (jobId || subscriptionId)) {
            // Fetch payment details to calculate commission
            if (jobId) {
                const job = await prisma_1.prisma.job.findUnique({
                    where: { id: jobId },
                    select: { payment_amount: true, payment_currency: true }
                });
                if (job && job.payment_amount) {
                    const consultant = await prisma_1.prisma.consultant.findUnique({
                        where: { id: consultantId },
                        select: { default_commission_rate: true }
                    });
                    commissionRate = rate || consultant?.default_commission_rate || 0.20;
                    amount = job.payment_amount * commissionRate;
                    commissionCurrency = job.payment_currency || 'USD';
                }
            }
            else if (subscriptionId) {
                const subscription = await prisma_1.prisma.subscription.findUnique({
                    where: { id: subscriptionId },
                    select: { base_price: true, currency: true }
                });
                if (subscription && subscription.base_price) {
                    const consultant = await prisma_1.prisma.consultant.findUnique({
                        where: { id: consultantId },
                        select: { default_commission_rate: true }
                    });
                    commissionRate = rate || consultant?.default_commission_rate || 0.20;
                    amount = subscription.base_price * commissionRate;
                    commissionCurrency = subscription.currency || 'USD';
                }
            }
        }
        if (!amount || amount <= 0)
            throw new http_exception_1.HttpException(400, 'Commission amount must be positive');
        return this.commissionRepository.transaction(async (tx) => {
            // Need to fetch consultant for region_id. Using global prisma for now inside tx context if possible or assume tx has access
            // Ideally Repository should expose method that accepts tx. 
            // For simplicity adapting logic:
            const consultant = await tx.consultant.findUnique({
                where: { id: consultantId },
                select: { region_id: true, email: true },
            });
            if (!consultant)
                throw new http_exception_1.HttpException(404, 'Consultant not found');
            const commission = await tx.commission.create({
                data: {
                    consultant_id: consultantId,
                    region_id: consultant.region_id,
                    job_id: jobId,
                    subscription_id: subscriptionId,
                    type,
                    amount,
                    description: description || `Commission for ${type}`,
                    status: client_1.CommissionStatus.CONFIRMED,
                    confirmed_at: new Date(),
                },
            });
            // Wallet interaction
            const account = await tx.virtualAccount.findUnique({
                where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultantId } }
            });
            let accountId = account?.id;
            if (!accountId) {
                const newAccount = await tx.virtualAccount.create({
                    data: {
                        owner_type: 'CONSULTANT',
                        owner_id: consultantId,
                        balance: 0,
                        status: 'ACTIVE'
                    }
                });
                accountId = newAccount.id;
            }
            await tx.virtualTransaction.create({
                data: {
                    virtual_account_id: accountId,
                    type: client_1.VirtualTransactionType.COMMISSION_EARNED,
                    amount,
                    balance_after: (account?.balance || 0) + amount,
                    direction: 'CREDIT',
                    status: 'COMPLETED',
                    description: `Commission earned: ${description || type}`,
                    reference_id: commission.id,
                    reference_type: 'COMMISSION'
                }
            });
            await tx.virtualAccount.update({
                where: { id: accountId },
                data: { balance: { increment: amount }, total_credits: { increment: amount } }
            });
            return commission;
        });
    }
    /**
     * Request commission (consultant-initiated) - creates PENDING, no wallet credit.
     * Admin must confirm to credit VirtualAccount.
     */
    async requestCommission(input) {
        const { consultantId, amount: providedAmount, type, jobId, subscriptionId, description, rate, calculateFromJob = false } = input;
        let amount = providedAmount;
        let commissionRate = rate;
        if (calculateFromJob && (jobId || subscriptionId)) {
            if (jobId) {
                const job = await prisma_1.prisma.job.findUnique({
                    where: { id: jobId },
                    select: { payment_amount: true }
                });
                if (job?.payment_amount) {
                    const consultant = await prisma_1.prisma.consultant.findUnique({
                        where: { id: consultantId },
                        select: { default_commission_rate: true }
                    });
                    commissionRate = rate ?? consultant?.default_commission_rate ?? 0.20;
                    amount = job.payment_amount * commissionRate;
                }
            }
            else if (subscriptionId) {
                const subscription = await prisma_1.prisma.subscription.findUnique({
                    where: { id: subscriptionId },
                    select: { base_price: true }
                });
                if (subscription?.base_price) {
                    const consultant = await prisma_1.prisma.consultant.findUnique({
                        where: { id: consultantId },
                        select: { default_commission_rate: true }
                    });
                    commissionRate = rate ?? consultant?.default_commission_rate ?? 0.20;
                    amount = subscription.base_price * commissionRate;
                }
            }
        }
        if (!amount || amount <= 0)
            throw new http_exception_1.HttpException(400, 'Commission amount must be positive');
        const consultant = await prisma_1.prisma.consultant.findUnique({
            where: { id: consultantId },
            select: { region_id: true }
        });
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        if (!consultant.region_id)
            throw new http_exception_1.HttpException(400, 'Consultant must have a region assigned');
        return prisma_1.prisma.commission.create({
            data: {
                consultant_id: consultantId,
                region_id: consultant.region_id,
                job_id: jobId ?? undefined,
                subscription_id: subscriptionId ?? undefined,
                type,
                amount,
                description: description || `Commission request: ${type}`,
                status: client_1.CommissionStatus.PENDING
            }
        });
    }
    async confirm(id) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission)
            throw new http_exception_1.HttpException(404, 'Commission not found');
        if (commission.status !== client_1.CommissionStatus.PENDING) {
            return this.commissionRepository.update(id, {
                status: client_1.CommissionStatus.CONFIRMED,
                confirmed_at: new Date()
            });
        }
        // PENDING → CONFIRMED: credit VirtualAccount so amount reflects in wallet
        return this.commissionRepository.transaction(async (tx) => {
            const consultantId = commission.consultant_id;
            const amount = Number(commission.amount);
            const description = commission.description || `Commission ${commission.type}`;
            let account = await tx.virtualAccount.findUnique({
                where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultantId } }
            });
            if (!account) {
                account = await tx.virtualAccount.create({
                    data: {
                        owner_type: 'CONSULTANT',
                        owner_id: consultantId,
                        balance: 0,
                        status: 'ACTIVE'
                    }
                });
            }
            const balanceAfter = Number(account.balance) + amount;
            await tx.virtualTransaction.create({
                data: {
                    virtual_account_id: account.id,
                    type: client_1.VirtualTransactionType.COMMISSION_EARNED,
                    amount,
                    balance_after: balanceAfter,
                    direction: 'CREDIT',
                    status: 'COMPLETED',
                    description: `Commission approved: ${description}`,
                    reference_id: commission.id,
                    reference_type: 'COMMISSION'
                }
            });
            await tx.virtualAccount.update({
                where: { id: account.id },
                data: { balance: { increment: amount }, total_credits: { increment: amount } }
            });
            return tx.commission.update({
                where: { id },
                data: { status: client_1.CommissionStatus.CONFIRMED, confirmed_at: new Date() }
            });
        });
    }
    async markAsPaid(id) {
        return this.commissionRepository.update(id, {
            status: client_1.CommissionStatus.PAID,
            paid_at: new Date()
        });
    }
    async processPayments(ids) {
        // Bulk pay
        await prisma_1.prisma.commission.updateMany({
            where: { id: { in: ids } },
            data: {
                status: client_1.CommissionStatus.PAID,
                paid_at: new Date()
            }
        });
    }
    async getRegional(regionId) {
        return this.commissionRepository.findMany({
            where: { region_id: regionId }
        });
    }
    /**
     * Dispute a commission
     */
    async dispute(id, reason) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission)
            throw new http_exception_1.HttpException(404, 'Commission not found');
        return this.commissionRepository.update(id, {
            status: client_1.CommissionStatus.DISPUTED,
            notes: commission.notes ? `${commission.notes}\n[DISPUTE]: ${reason}` : `[DISPUTE]: ${reason}`
        });
    }
    /**
     * Resolve a commission dispute
     */
    async resolveDispute(id, resolution, notes) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission)
            throw new http_exception_1.HttpException(404, 'Commission not found');
        if (commission.status !== client_1.CommissionStatus.DISPUTED) {
            throw new http_exception_1.HttpException(400, 'Commission is not disputed');
        }
        const resolutionNote = `[RESOLUTION]: ${resolution} - ${notes || ''}`;
        const updatedNotes = commission.notes ? `${commission.notes}\n${resolutionNote}` : resolutionNote;
        if (resolution === 'VALID') {
            // Restore to previous valid state (default to CONFIRMED if unclear, or check history? simplified: CONFIRMED)
            // If it was PAID, we should probably mark as PAID.
            // For now, let's restore to CONFIRMED as a safe default for active commissions.
            // TODO: Store previous status in metadata if strictness required.
            return this.commissionRepository.update(id, {
                status: client_1.CommissionStatus.CONFIRMED,
                notes: updatedNotes
            });
        }
        else {
            // Invalid commission -> Clawback
            return this.clawback(id, `Dispute resolved as INVALID. ${notes || ''}`);
        }
    }
    /**
     * Clawback (Reverse) a commission
     */
    async clawback(id, reason) {
        const commission = await this.commissionRepository.findById(id);
        if (!commission)
            throw new http_exception_1.HttpException(404, 'Commission not found');
        if (commission.status === client_1.CommissionStatus.CLAWBACK || commission.status === client_1.CommissionStatus.CANCELLED) {
            throw new http_exception_1.HttpException(400, 'Commission already reversed');
        }
        // If PENDING, just cancel
        if (commission.status === client_1.CommissionStatus.PENDING) {
            return this.commissionRepository.update(id, {
                status: client_1.CommissionStatus.CANCELLED,
                notes: commission.notes ? `${commission.notes}\n[CANCELLED]: ${reason}` : `[CANCELLED]: ${reason}`
            });
        }
        // If CONFIRMED, PAID, or DISPUTED (post-confirm), we need to deduct wallet
        return this.commissionRepository.transaction(async (tx) => {
            const amount = Number(commission.amount);
            const consultantId = commission.consultant_id;
            const account = await tx.virtualAccount.findUnique({
                where: { owner_type_owner_id: { owner_type: 'CONSULTANT', owner_id: consultantId } }
            });
            if (account) {
                const balanceAfter = Number(account.balance) - amount;
                await tx.virtualTransaction.create({
                    data: {
                        virtual_account_id: account.id,
                        type: client_1.VirtualTransactionType.COMMISSION_CLAWBACK,
                        amount: amount,
                        balance_after: balanceAfter,
                        direction: 'DEBIT',
                        status: 'COMPLETED',
                        description: `Clawback: ${reason}`,
                        reference_id: commission.id,
                        reference_type: 'COMMISSION'
                    }
                });
                await tx.virtualAccount.update({
                    where: { id: account.id },
                    data: {
                        balance: { decrement: amount },
                        // Do we decrement total_credits? Usually no, total_credits is historical. 
                        // We might want a total_debits field or just leave balance.
                        // Leaving total_credits as is (historical earnings).
                    }
                });
            }
            return tx.commission.update({
                where: { id },
                data: {
                    status: client_1.CommissionStatus.CLAWBACK,
                    notes: commission.notes ? `${commission.notes}\n[CLAWBACK]: ${reason}` : `[CLAWBACK]: ${reason}`
                }
            });
        });
    }
}
exports.CommissionService = CommissionService;
