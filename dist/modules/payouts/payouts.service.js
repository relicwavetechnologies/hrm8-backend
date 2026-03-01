"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutsService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
const consultant_withdrawal_service_1 = require("../consultant/consultant-withdrawal.service");
class PayoutsService {
    constructor() {
        this.consultantWithdrawalService = new consultant_withdrawal_service_1.ConsultantWithdrawalService();
    }
    async createBeneficiary(consultantId) {
        const consultant = await prisma_1.prisma.consultant.findUnique({ where: { id: consultantId } });
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        let accountId = consultant.stripe_account_id;
        if (!accountId) {
            accountId = `awx_benef_${crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 20)}`;
            await prisma_1.prisma.consultant.update({
                where: { id: consultantId },
                data: {
                    stripe_account_id: accountId,
                    stripe_account_status: 'active',
                    payout_enabled: true,
                    stripe_onboarded_at: new Date(),
                },
            });
        }
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        const onboardingUrl = `${frontendUrl}/consultant360/earnings?airwallex_success=true`;
        return {
            provider: 'AIRWALLEX',
            accountId,
            onboardingUrl,
            accountLink: { url: onboardingUrl },
            status: 'active',
        };
    }
    async getStatus(consultantId) {
        const consultant = await prisma_1.prisma.consultant.findUnique({
            where: { id: consultantId },
            select: {
                stripe_account_id: true,
                stripe_account_status: true,
                payout_enabled: true,
                stripe_onboarded_at: true,
            },
        });
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        const hasAccount = !!consultant.stripe_account_id;
        const payoutsEnabled = !!consultant.payout_enabled || consultant.stripe_account_status === 'active';
        return {
            provider: 'AIRWALLEX',
            hasAccount,
            accountId: consultant.stripe_account_id || undefined,
            accountStatus: consultant.stripe_account_status || null,
            payoutsEnabled,
            chargesEnabled: payoutsEnabled,
            detailsSubmitted: hasAccount,
            requiresAction: hasAccount && !payoutsEnabled,
            onboardedAt: consultant.stripe_onboarded_at || null,
            payoutEnabled: payoutsEnabled,
            isConnected: hasAccount && payoutsEnabled,
        };
    }
    async getLoginLink(consultantId) {
        const consultant = await prisma_1.prisma.consultant.findUnique({ where: { id: consultantId } });
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        if (!consultant.stripe_account_id) {
            throw new http_exception_1.HttpException(400, 'Beneficiary not connected');
        }
        const url = `https://www.airwallex.com/app/login?beneficiary=${consultant.stripe_account_id}`;
        return {
            provider: 'AIRWALLEX',
            accountId: consultant.stripe_account_id,
            url,
            loginLink: url,
            dashboardUrl: url,
        };
    }
    async executeWithdrawal(withdrawalId, consultantId) {
        const withdrawal = await this.consultantWithdrawalService.executeWithdrawal(withdrawalId, consultantId);
        return {
            provider: 'AIRWALLEX',
            withdrawal,
            message: 'Withdrawal execution initiated through Airwallex payout rail',
        };
    }
}
exports.PayoutsService = PayoutsService;
