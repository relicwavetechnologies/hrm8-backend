"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesController = void 0;
const controller_1 = require("../../core/controller");
const sales_service_1 = require("./sales.service");
const sales_repository_1 = require("./sales.repository");
class SalesController extends controller_1.BaseController {
    constructor() {
        super();
        // --- Dashboard ---
        this.getDashboardStats = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const stats = await this.salesService.getDashboardStats(req.consultant.id);
                return this.sendSuccess(res, stats);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // --- Leads ---
        this.getLeads = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const { status, region } = req.query;
                const leads = await this.salesService.getLeads(req.consultant.id, {
                    status: status,
                    region: region
                });
                return this.sendSuccess(res, { leads });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createLead = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const lead = await this.salesService.createLead(req.consultant.id, req.body);
                res.status(201);
                return this.sendSuccess(res, { lead });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.convertLead = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const leadId = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;
                const result = await this.salesService.convertLead(leadId, req.consultant.id, req.body);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.submitConversionRequest = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const leadId = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;
                const request = await this.salesService.submitConversionRequest(req.consultant.id, leadId, req.body);
                res.status(201);
                return this.sendSuccess(res, { request });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // --- Conversion Requests ---
        this.getConversionRequests = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const requests = await this.salesService.getConversionRequests(req.consultant.id);
                return this.sendSuccess(res, { requests });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getConversionRequest = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const request = await this.salesService.getConversionRequest(id, req.consultant.id);
                return this.sendSuccess(res, { request });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.cancelConversionRequest = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const request = await this.salesService.cancelConversionRequest(id, req.consultant.id);
                return this.sendSuccess(res, { request });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // --- Companies ---
        this.getCompanies = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const { region, status } = req.query;
                const companies = await this.salesService.getCompanies(req.consultant.id, {
                    region: region,
                    status: status
                });
                return this.sendSuccess(res, { companies });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // --- Commissions ---
        this.getCommissions = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const { status } = req.query;
                const commissions = await this.salesService.getCommissions(req.consultant.id, {
                    status: status
                });
                return this.sendSuccess(res, { commissions });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getWithdrawalBalance = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const balance = await this.salesService.getWithdrawalBalance(req.consultant.id);
                return this.sendSuccess(res, balance);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // --- Withdrawals ---
        this.requestWithdrawal = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const withdrawal = await this.salesService.requestWithdrawal(req.consultant.id, req.body);
                res.status(201);
                return this.sendSuccess(res, { withdrawal });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getWithdrawals = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const { status } = req.query;
                const withdrawals = await this.salesService.getWithdrawals(req.consultant.id, {
                    status: status
                });
                return this.sendSuccess(res, { withdrawals });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.cancelWithdrawal = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const withdrawal = await this.salesService.cancelWithdrawal(id, req.consultant.id);
                return this.sendSuccess(res, { withdrawal });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.executeWithdrawal = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const withdrawal = await this.salesService.executeWithdrawal(id, req.consultant.id);
                return this.sendSuccess(res, { withdrawal, message: 'Withdrawal execution initiated' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // --- Stripe ---
        this.getStripeStatus = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const status = await this.salesService.getStripeStatus(req.consultant.id);
                return this.sendSuccess(res, status);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.initiateStripeOnboarding = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const result = await this.salesService.initiateStripeOnboarding(req.consultant.id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getStripeLoginLink = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'), 401);
                const result = await this.salesService.getStripeLoginLink(req.consultant.id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // --- Opportunities ---
        this.getOpportunities = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'));
                const isHrm8Admin = res.locals.isHrm8Admin === true;
                const opportunities = await this.salesService.getOpportunities(isHrm8Admin ? null : req.consultant.id, {
                    stage: req.query.stage,
                    companyId: req.query.companyId
                });
                return this.sendSuccess(res, { opportunities });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getPipelineStats = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'));
                const isHrm8Admin = res.locals.isHrm8Admin === true;
                const stats = await this.salesService.getPipelineStats(isHrm8Admin ? null : req.consultant.id);
                return this.sendSuccess(res, stats);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createOpportunity = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'));
                const opportunity = await this.salesService.createOpportunity({
                    ...req.body,
                    salesAgentId: req.consultant.id
                });
                return this.sendSuccess(res, { opportunity });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateOpportunity = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const opportunity = await this.salesService.updateOpportunity(id, req.body);
                return this.sendSuccess(res, { opportunity });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // --- Activities ---
        this.getActivities = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'));
                const activities = await this.salesService.getActivities({
                    consultantId: req.consultant.id,
                    companyId: req.query.companyId,
                    leadId: req.query.leadId,
                    opportunityId: req.query.opportunityId,
                    limit: req.query.limit ? parseInt(req.query.limit) : undefined
                });
                return this.sendSuccess(res, { activities });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createActivity = async (req, res) => {
            try {
                if (!req.consultant)
                    return this.sendError(res, new Error('Not authenticated'));
                const activity = await this.salesService.logActivity({
                    ...req.body,
                    createdBy: req.consultant.id
                });
                return this.sendSuccess(res, { activity });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.salesService = new sales_service_1.SalesService(new sales_repository_1.SalesRepository());
    }
}
exports.SalesController = SalesController;
