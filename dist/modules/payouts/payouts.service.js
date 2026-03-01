"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutsService = void 0;
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
const airwallex_service_1 = require("../airwallex/airwallex.service");
const commission_payout_service_1 = require("./commission-payout.service");
const logger_1 = require("../../utils/logger");
const log = logger_1.Logger.create('payouts');
class PayoutsService {
    async createBeneficiary(consultantId, bankDetails) {
        const consultant = await prisma_1.prisma.consultant.findUnique({ where: { id: consultantId } });
        if (!consultant)
            throw new http_exception_1.HttpException(404, 'Consultant not found');
        let beneficiaryId = consultant.airwallex_beneficiary_id || consultant.stripe_account_id;
        if (!beneficiaryId) {
            const result = await airwallex_service_1.AirwallexService.createBeneficiary(consultantId, bankDetails || {});
            beneficiaryId = result.beneficiaryId;
            await prisma_1.prisma.consultant.update({
                where: { id: consultantId },
                data: {
                    airwallex_beneficiary_id: beneficiaryId,
                    stripe_account_id: beneficiaryId,
                    stripe_account_status: 'active',
                    payout_enabled: true,
                    stripe_onboarded_at: new Date(),
                },
            });
            log.info('Beneficiary created', { consultantId, beneficiaryId });
        }
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        const onboardingUrl = `${frontendUrl}/consultant360/earnings?airwallex_success=true`;
        return {
            provider: 'AIRWALLEX',
            accountId: beneficiaryId,
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
        const withdrawal = await prisma_1.prisma.commissionWithdrawal.findUnique({
            where: { id: withdrawalId },
        });
        if (!withdrawal)
            throw new http_exception_1.HttpException(404, 'Withdrawal not found');
        if (withdrawal.consultant_id !== consultantId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        const result = await commission_payout_service_1.CommissionPayoutService.executeWithdrawalPayout(withdrawalId);
        log.info('Withdrawal payout executed', {
            withdrawalId,
            transferId: result.transferId,
            xeroBillId: result.xeroBillId,
            status: result.status,
        });
        return {
            provider: 'AIRWALLEX',
            transferId: result.transferId,
            xeroBillId: result.xeroBillId,
            status: result.status,
            message: result.status === 'COMPLETED'
                ? 'Payout completed — Airwallex transfer and Xero expense recorded'
                : 'Payout processing — Airwallex transfer initiated, awaiting completion webhook',
        };
    }
}
exports.PayoutsService = PayoutsService;
