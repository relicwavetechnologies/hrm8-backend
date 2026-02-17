"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Consultant360Controller = void 0;
const controller_1 = require("../../core/controller");
const consultant360_service_1 = require("./consultant360.service");
const consultant360_repository_1 = require("./consultant360.repository");
const http_exception_1 = require("../../core/http-exception");
class Consultant360Controller extends controller_1.BaseController {
    constructor() {
        super();
        // Dashboard
        this.getDashboard = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const dashboard = await this.service.getDashboard(consultantId);
                return this.sendSuccess(res, dashboard);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Leads
        this.getLeads = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const status = req.query.status;
                const region = req.query.region;
                const leads = await this.service.getLeads(consultantId, { status, region });
                return this.sendSuccess(res, { leads });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createLead = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const lead = await this.service.createLead(consultantId, req.body);
                return this.sendSuccess(res, { lead });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.submitConversionRequest = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const { leadId } = req.params;
                const conversionRequest = await this.service.submitConversionRequest(consultantId, leadId, req.body);
                return this.sendSuccess(res, { conversionRequest });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Earnings
        this.getEarnings = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const earnings = await this.service.getEarnings(consultantId);
                return this.sendSuccess(res, earnings);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Commissions
        this.requestCommission = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const commission = await this.service.requestCommission(consultantId, req.body);
                return this.sendSuccess(res, { commission });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getCommissions = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const status = req.query.status;
                const commissions = await this.service.getCommissions(consultantId, { status });
                return this.sendSuccess(res, { commissions });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Balance
        this.getBalance = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const balance = await this.service.getBalance(consultantId);
                return this.sendSuccess(res, balance);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Withdrawals
        this.requestWithdrawal = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const withdrawal = await this.service.requestWithdrawal(consultantId, req.body);
                return this.sendSuccess(res, { withdrawal });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getWithdrawals = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const status = req.query.status;
                const withdrawals = await this.service.getWithdrawals(consultantId, { status });
                return this.sendSuccess(res, { withdrawals });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.cancelWithdrawal = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const { id } = req.params;
                const withdrawal = await this.service.cancelWithdrawal(id, consultantId);
                return this.sendSuccess(res, { withdrawal });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.executeWithdrawal = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const { id } = req.params;
                const withdrawal = await this.service.executeWithdrawal(id, consultantId);
                return this.sendSuccess(res, { withdrawal });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Stripe
        this.stripeOnboard = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const result = await this.service.initiateStripeOnboarding(consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getStripeStatus = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const status = await this.service.getStripeStatus(consultantId);
                return this.sendSuccess(res, status);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getStripeLoginLink = async (req, res) => {
            try {
                const consultantId = req.consultant?.id;
                if (!consultantId) {
                    throw new http_exception_1.HttpException(401, 'Unauthorized');
                }
                const link = await this.service.getStripeLoginLink(consultantId);
                return this.sendSuccess(res, link);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.service = new consultant360_service_1.Consultant360Service(new consultant360_repository_1.Consultant360Repository());
    }
}
exports.Consultant360Controller = Consultant360Controller;
