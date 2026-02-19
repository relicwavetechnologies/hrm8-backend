"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyRepository = void 0;
const repository_1 = require("../../core/repository");
class CompanyRepository extends repository_1.BaseRepository {
    // --- Company ---
    async create(data) {
        return this.prisma.company.create({ data });
    }
    async update(id, data) {
        return this.prisma.company.update({
            where: { id },
            data,
        });
    }
    async findById(id) {
        return this.prisma.company.findUnique({
            where: { id },
        });
    }
    async findByDomain(domain) {
        return this.prisma.company.findUnique({
            where: { domain },
        });
    }
    async findAll(limit = 100, offset = 0) {
        return this.prisma.company.findMany({
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset,
        });
    }
    async delete(id) {
        return this.prisma.company.delete({
            where: { id },
        });
    }
    async countByDomain(domain) {
        return this.prisma.company.count({
            where: { domain },
        });
    }
    // --- Company Profile ---
    async createProfile(data) {
        return this.prisma.companyProfile.create({ data });
    }
    async updateProfile(companyId, data) {
        return this.prisma.companyProfile.update({
            where: { company_id: companyId },
            data,
        });
    }
    async findProfileByCompanyId(companyId) {
        return this.prisma.companyProfile.findUnique({
            where: { company_id: companyId },
        });
    }
    async upsertProfile(companyId, createData, updateData) {
        return this.prisma.companyProfile.upsert({
            where: { company_id: companyId },
            create: createData,
            update: updateData,
        });
    }
    // --- Transactions ---
    async findTransactions(companyId, limit, offset) {
        return this.prisma.virtualTransaction.findMany({
            where: {
                virtual_account: {
                    owner_type: 'COMPANY',
                    owner_id: companyId
                }
            },
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset,
            include: {
                virtual_account: {
                    select: {
                        id: true,
                        owner_type: true,
                        owner_id: true,
                        balance: true
                    }
                }
            }
        });
    }
    async getTransactionStats(companyId) {
        const transactions = await this.prisma.virtualTransaction.findMany({
            where: {
                virtual_account: {
                    owner_type: 'COMPANY',
                    owner_id: companyId
                }
            },
            select: {
                amount: true,
                type: true,
                direction: true,
                status: true,
                created_at: true
            }
        });
        const totalTransactions = transactions.length;
        const totalDebited = transactions
            .filter(t => t.direction === 'DEBIT' && t.status === 'COMPLETED')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalCredited = transactions
            .filter(t => t.direction === 'CREDIT' && t.status === 'COMPLETED')
            .reduce((sum, t) => sum + t.amount, 0);
        const pendingAmount = transactions
            .filter(t => t.status === 'PENDING')
            .reduce((sum, t) => sum + t.amount, 0);
        return {
            totalTransactions,
            totalDebited,
            totalCredited,
            pendingAmount,
            netFlow: totalCredited - totalDebited
        };
    }
    // --- Refund Requests ---
    async createRefundRequest(data) {
        return this.prisma.transactionRefundRequest.create({ data });
    }
    async findRefundRequests(filters, limit, offset) {
        return this.prisma.transactionRefundRequest.findMany({
            where: filters,
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset,
            include: {
                company: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
    }
    async findRefundRequestById(id) {
        return this.prisma.transactionRefundRequest.findUnique({
            where: { id },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
    }
    async updateRefundRequest(id, data) {
        return this.prisma.transactionRefundRequest.update({
            where: { id },
            data,
            include: {
                company: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
    }
    async deleteRefundRequest(id) {
        return this.prisma.transactionRefundRequest.delete({ where: { id } });
    }
}
exports.CompanyRepository = CompanyRepository;
