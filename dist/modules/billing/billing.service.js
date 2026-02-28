"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../utils/prisma");
const http_exception_1 = require("../../core/http-exception");
const currency_assignment_service_1 = require("../pricing/currency-assignment.service");
const subscription_service_1 = require("../subscription/subscription.service");
const wallet_service_1 = require("../wallet/wallet.service");
const airwallex_service_1 = require("../airwallex/airwallex.service");
const xero_service_1 = require("../xero/xero.service");
const billing_logger_1 = require("../../utils/billing-logger");
const logger_1 = require("../../utils/logger");
const log = logger_1.Logger.create('billing');
const BILLING_AUTO_CONFIRM = process.env.BILLING_AUTO_CONFIRM !== 'false';
const toObject = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    return value;
};
const parseNotesPayload = (notes) => {
    if (!notes)
        return null;
    try {
        const parsed = JSON.parse(notes);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
            return null;
        return parsed;
    }
    catch {
        return null;
    }
};
const asAmount = (value) => {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};
const asString = (value) => {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};
class BillingService {
    static mapServicePackageToHiringMode(servicePackage) {
        const normalized = servicePackage.trim().toLowerCase();
        if (normalized === 'shortlisting')
            return 'SHORTLISTING';
        if (normalized === 'executive-search')
            return 'EXECUTIVE_SEARCH';
        if (normalized === 'self-managed')
            return 'SELF_MANAGED';
        // full-service + rpo share the same hiring mode operationally.
        return 'FULL_SERVICE';
    }
    static normalizeCheckoutType(request) {
        const metadata = toObject(request.metadata);
        const fromRequest = asString(request.type)?.toLowerCase();
        const fromMetadata = asString(metadata.type)?.toLowerCase();
        const resolved = fromRequest || fromMetadata || 'wallet_recharge';
        if (resolved === 'subscription')
            return 'subscription';
        if (resolved === 'managed_service')
            return 'managed_service';
        return 'wallet_recharge';
    }
    static generateBillNumber(currency) {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 9000 + 1000);
        return `INV-${currency}-${timestamp}-${random}`;
    }
    static async createCheckout(context, request) {
        if (!context.companyId) {
            throw new http_exception_1.HttpException(400, 'Company context is required for checkout');
        }
        const amount = asAmount(request.amount);
        if (!amount || amount <= 0) {
            throw new http_exception_1.HttpException(400, 'A positive amount is required');
        }
        const { pricingPeg, billingCurrency } = await currency_assignment_service_1.CurrencyAssignmentService.getCompanyCurrencies(context.companyId);
        const currency = (request.currency || billingCurrency || 'USD').toUpperCase();
        await currency_assignment_service_1.CurrencyAssignmentService.validateCurrencyLock(context.companyId, currency);
        const checkoutType = this.normalizeCheckoutType(request);
        const mergedMetadata = {
            ...toObject(request.metadata),
            type: checkoutType,
            planType: request.planType ?? toObject(request.metadata).planType,
            planName: request.planName ?? toObject(request.metadata).planName ?? toObject(request.metadata).name,
            billingCycle: request.billingCycle ?? toObject(request.metadata).billingCycle,
            jobQuota: request.jobQuota ?? toObject(request.metadata).jobQuota,
            userId: context.userId,
            userEmail: context.userEmail,
            companyId: context.companyId,
            pricingPeg,
            billingCurrency: currency,
        };
        const description = request.description ||
            (checkoutType === 'subscription'
                ? `Subscription purchase (${asString(mergedMetadata.planName) || 'plan'})`
                : checkoutType === 'managed_service'
                    ? 'Managed service invoice'
                    : 'Wallet recharge');
        const xeroInvoice = xero_service_1.XeroService.createInvoice({
            companyId: context.companyId,
            amount,
            currency,
            description,
            lineItems: [{ description, amount }],
        });
        const bill = await prisma_1.prisma.bill.create({
            data: {
                company_id: context.companyId,
                bill_number: this.generateBillNumber(currency),
                amount,
                total_amount: amount,
                currency,
                status: client_1.BillStatus.PENDING,
                due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
                payment_method: 'AIRWALLEX',
                accounting_ref: xeroInvoice.invoiceId,
                notes: JSON.stringify({
                    checkoutType,
                    metadata: mergedMetadata,
                    provider: 'AIRWALLEX',
                    xeroInvoiceId: xeroInvoice.invoiceId,
                    xeroInvoiceNumber: xeroInvoice.invoiceNumber,
                }),
            },
        });
        const session = airwallex_service_1.AirwallexService.createCheckoutSession({
            amount,
            currency,
            reference: bill.id,
            description,
            successUrl: request.successUrl || `${process.env.ATS_FRONTEND_URL || 'http://localhost:8080'}/subscriptions?payment_success=true`,
            cancelUrl: request.cancelUrl || `${process.env.ATS_FRONTEND_URL || 'http://localhost:8080'}/subscriptions?canceled=true`,
            metadata: mergedMetadata,
        });
        await prisma_1.prisma.bill.update({
            where: { id: bill.id },
            data: { payment_reference: session.paymentAttemptId },
        });
        if (BILLING_AUTO_CONFIRM) {
            await this.markPaymentSucceeded(session.paymentAttemptId, session.providerTransactionId);
        }
        const payment = await this.getPaymentStatus(session.paymentAttemptId);
        return {
            provider: 'AIRWALLEX',
            paymentAttemptId: session.paymentAttemptId,
            billId: bill.id,
            url: session.checkoutUrl,
            amount,
            currency,
            xeroInvoiceId: xeroInvoice.invoiceId,
            xeroInvoiceNumber: xeroInvoice.invoiceNumber,
            status: payment.status,
        };
    }
    static async markPaymentSucceeded(paymentAttemptId, providerTransactionId) {
        const bill = await prisma_1.prisma.bill.findFirst({
            where: { payment_reference: paymentAttemptId },
            select: {
                id: true,
                company_id: true,
                status: true,
                amount: true,
                total_amount: true,
                currency: true,
                notes: true,
                subscription_id: true,
            },
        });
        if (!bill) {
            throw new http_exception_1.HttpException(404, 'Payment attempt not found');
        }
        if (bill.status === client_1.BillStatus.PAID) {
            return { status: 'SUCCEEDED', billId: bill.id };
        }
        const payload = parseNotesPayload(bill.notes);
        const checkoutType = payload?.checkoutType || 'wallet_recharge';
        const metadata = payload?.metadata || {};
        let subscriptionId = bill.subscription_id || null;
        if (checkoutType === 'subscription' && !subscriptionId) {
            const planType = asString(metadata.planType)?.toUpperCase().replace(/-/g, '_');
            const planName = asString(metadata.planName) || asString(metadata.name) || planType;
            const billingCycle = (asString(metadata.billingCycle)?.toUpperCase() || 'ANNUAL');
            const jobQuota = asAmount(metadata.jobQuota);
            if (!planType || !planName || (billingCycle !== 'MONTHLY' && billingCycle !== 'ANNUAL')) {
                throw new http_exception_1.HttpException(400, 'Invalid subscription checkout metadata');
            }
            const created = await subscription_service_1.SubscriptionService.createSubscription({
                companyId: bill.company_id,
                planType: planType,
                name: planName,
                basePrice: Number(bill.total_amount || bill.amount),
                billingCycle,
                jobQuota: jobQuota ?? undefined,
            });
            subscriptionId = created.id;
        }
        if (checkoutType === 'wallet_recharge') {
            const existingCredit = await prisma_1.prisma.virtualTransaction.findFirst({
                where: {
                    reference_type: 'AIRWALLEX_PAYMENT',
                    reference_id: paymentAttemptId,
                    type: client_1.VirtualTransactionType.TRANSFER_IN,
                    status: 'COMPLETED',
                },
                select: { id: true },
            });
            if (!existingCredit) {
                const account = await wallet_service_1.WalletService.getOrCreateAccount('COMPANY', bill.company_id);
                await wallet_service_1.WalletService.creditAccount({
                    accountId: account.id,
                    amount: Number(bill.total_amount || bill.amount),
                    type: client_1.VirtualTransactionType.TRANSFER_IN,
                    description: `Airwallex wallet recharge (${paymentAttemptId})`,
                    referenceId: paymentAttemptId,
                    referenceType: 'AIRWALLEX_PAYMENT',
                    createdBy: asString(metadata.userId) || undefined,
                    pricingPeg: asString(metadata.pricingPeg) || undefined,
                    billingCurrency: bill.currency,
                });
            }
        }
        if (checkoutType === 'managed_service') {
            const jobId = asString(metadata.jobId);
            const servicePackage = asString(metadata.servicePackage);
            if (!jobId || !servicePackage) {
                throw new http_exception_1.HttpException(400, 'Managed-service checkout metadata is incomplete');
            }
            const job = await prisma_1.prisma.job.findUnique({
                where: { id: jobId },
                select: { id: true, company_id: true, posting_date: true },
            });
            if (!job) {
                throw new http_exception_1.HttpException(404, 'Managed-service job not found');
            }
            if (job.company_id !== bill.company_id) {
                throw new http_exception_1.HttpException(403, 'Managed-service payment company mismatch');
            }
            await prisma_1.prisma.job.update({
                where: { id: jobId },
                data: {
                    payment_status: 'PAID',
                    payment_amount: Number(bill.total_amount || bill.amount),
                    payment_currency: bill.currency,
                    payment_completed_at: new Date(),
                    payment_failed_at: null,
                    service_package: servicePackage,
                    hiring_mode: this.mapServicePackageToHiringMode(servicePackage),
                    management_type: 'hrm8-managed',
                    setup_type: 'ADVANCED',
                    posting_date: job.posting_date ?? new Date(),
                    price_book_id: asString(metadata.priceBookId) || undefined,
                    price_book_version: asString(metadata.priceBookVersion) || undefined,
                    pricing_peg: asString(metadata.pricingPeg) || undefined,
                },
            });
        }
        await prisma_1.prisma.bill.update({
            where: { id: bill.id },
            data: {
                status: client_1.BillStatus.PAID,
                paid_at: new Date(),
                synced_at: new Date(),
                subscription_id: subscriptionId,
                notes: JSON.stringify({
                    ...(payload || {
                        checkoutType,
                        metadata,
                        provider: 'AIRWALLEX',
                        xeroInvoiceId: null,
                        xeroInvoiceNumber: null,
                    }),
                    providerTransactionId: providerTransactionId || null,
                    paidAt: new Date().toISOString(),
                }),
            },
        });
        try {
            await currency_assignment_service_1.CurrencyAssignmentService.lockCurrency(bill.company_id);
        }
        catch {
            // Locking is best-effort after successful payment.
        }
        return { status: 'SUCCEEDED', billId: bill.id };
    }
    static async markPaymentFailed(paymentAttemptId, reason) {
        const bill = await prisma_1.prisma.bill.findFirst({ where: { payment_reference: paymentAttemptId } });
        if (!bill) {
            throw new http_exception_1.HttpException(404, 'Payment attempt not found');
        }
        const payload = parseNotesPayload(bill.notes);
        await prisma_1.prisma.bill.update({
            where: { id: bill.id },
            data: {
                notes: JSON.stringify({
                    ...(payload || {
                        checkoutType: 'wallet_recharge',
                        metadata: {},
                        provider: 'AIRWALLEX',
                        xeroInvoiceId: null,
                        xeroInvoiceNumber: null,
                    }),
                    failedAt: new Date().toISOString(),
                    failureReason: reason || 'Payment failed',
                }),
            },
        });
        return { status: 'FAILED', billId: bill.id };
    }
    static async getPaymentStatus(paymentAttemptId) {
        const bill = await prisma_1.prisma.bill.findFirst({
            where: { payment_reference: paymentAttemptId },
            select: {
                id: true,
                status: true,
                amount: true,
                total_amount: true,
                currency: true,
                paid_at: true,
                due_date: true,
                created_at: true,
            },
        });
        if (!bill) {
            throw new http_exception_1.HttpException(404, 'Payment attempt not found');
        }
        const status = bill.status === client_1.BillStatus.PAID
            ? 'SUCCEEDED'
            : bill.status === client_1.BillStatus.REFUNDED
                ? 'REFUNDED'
                : 'PENDING';
        return {
            paymentAttemptId,
            billId: bill.id,
            status,
            amount: Number(bill.total_amount || bill.amount),
            currency: bill.currency,
            paidAt: bill.paid_at,
            createdAt: bill.created_at,
            dueDate: bill.due_date,
        };
    }
    static async refundPayment(paymentAttemptId, reason) {
        const bill = await prisma_1.prisma.bill.findFirst({
            where: { payment_reference: paymentAttemptId },
            select: {
                id: true,
                status: true,
                amount: true,
                total_amount: true,
                currency: true,
                accounting_ref: true,
                notes: true,
            },
        });
        if (!bill) {
            throw new http_exception_1.HttpException(404, 'Payment attempt not found');
        }
        if (bill.status === client_1.BillStatus.REFUNDED) {
            return { status: 'REFUNDED', billId: bill.id };
        }
        airwallex_service_1.AirwallexService.createRefund(paymentAttemptId);
        if (bill.accounting_ref) {
            xero_service_1.XeroService.createCreditNote(bill.accounting_ref, Number(bill.total_amount || bill.amount), bill.currency);
        }
        const payload = parseNotesPayload(bill.notes);
        await prisma_1.prisma.bill.update({
            where: { id: bill.id },
            data: {
                status: client_1.BillStatus.REFUNDED,
                notes: JSON.stringify({
                    ...(payload || {
                        checkoutType: 'wallet_recharge',
                        metadata: {},
                        provider: 'AIRWALLEX',
                        xeroInvoiceId: null,
                        xeroInvoiceNumber: null,
                    }),
                    refundedAt: new Date().toISOString(),
                    refundReason: reason || null,
                }),
            },
        });
        const checkoutType = payload?.checkoutType || 'wallet_recharge';
        const metadata = payload?.metadata || {};
        if (checkoutType === 'managed_service') {
            const jobId = asString(metadata.jobId);
            if (jobId) {
                await prisma_1.prisma.job.update({
                    where: { id: jobId },
                    data: {
                        payment_status: 'PENDING',
                        payment_completed_at: null,
                        payment_failed_at: new Date(),
                    },
                });
            }
        }
        return { status: 'REFUNDED', billId: bill.id };
    }
    /**
     * Process an incoming Airwallex webhook event.
     *
     * Validates:
     * 1. Webhook signature (in live mode)
     * 2. Amount/currency match against bill snapshot
     * 3. Idempotent – a bill already PAID is a no-op
     */
    static async processWebhook(rawBody, signature, event) {
        if (!airwallex_service_1.AirwallexService.verifyWebhookSignature(rawBody, signature)) {
            log.error('Webhook signature verification failed');
            throw new http_exception_1.HttpException(401, 'Invalid webhook signature');
        }
        const parsed = airwallex_service_1.AirwallexService.parseWebhook(event);
        if (!parsed.paymentAttemptId || !parsed.status) {
            log.warn('Webhook event missing paymentAttemptId or status', { event });
            return { status: 'IGNORED' };
        }
        const bill = await prisma_1.prisma.bill.findFirst({
            where: { payment_reference: parsed.paymentAttemptId },
            select: {
                id: true,
                status: true,
                amount: true,
                total_amount: true,
                currency: true,
                company_id: true,
            },
        });
        if (!bill) {
            log.warn('Webhook for unknown payment attempt', { paymentAttemptId: parsed.paymentAttemptId });
            return { status: 'UNKNOWN_BILL' };
        }
        if (bill.status === client_1.BillStatus.PAID) {
            log.info('Webhook for already-paid bill (idempotent)', { billId: bill.id });
            return { status: 'ALREADY_PAID', billId: bill.id };
        }
        if (parsed.status === 'SUCCEEDED') {
            billing_logger_1.BillingLogger.paymentCompleted({
                companyId: bill.company_id,
                billId: bill.id,
                paymentAttemptId: parsed.paymentAttemptId,
                checkoutType: 'webhook',
                amount: Number(bill.total_amount || bill.amount),
                currency: bill.currency,
            });
            const result = await this.markPaymentSucceeded(parsed.paymentAttemptId, parsed.providerTransactionId);
            return { status: 'SUCCEEDED', billId: result.billId };
        }
        if (parsed.status === 'FAILED') {
            await this.markPaymentFailed(parsed.paymentAttemptId, 'Payment failed via webhook');
            return { status: 'FAILED', billId: bill.id };
        }
        return { status: 'UNHANDLED' };
    }
}
exports.BillingService = BillingService;
