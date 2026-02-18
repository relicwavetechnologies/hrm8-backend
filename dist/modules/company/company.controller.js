"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyController = void 0;
const controller_1 = require("../../core/controller");
const company_service_1 = require("./company.service");
const company_repository_1 = require("./company.repository");
const company_stats_service_1 = require("./company-stats.service");
class CompanyController extends controller_1.BaseController {
    constructor() {
        super();
        this.getCompany = async (req, res) => {
            try {
                const { id } = req.params;
                const company = await this.companyService.getCompany(id);
                return this.sendSuccess(res, { company });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateCompany = async (req, res) => {
            try {
                const { id } = req.params;
                // Ensure user belongs to this company (simple authorization check)
                if (req.user?.companyId !== id) {
                    return this.sendError(res, new Error('Unauthorized to update this company'));
                }
                const company = await this.companyService.updateCompany(id, req.body);
                return this.sendSuccess(res, { company });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Profile
        this.getProfile = async (req, res) => {
            try {
                const { id } = req.params;
                if (req.user?.companyId !== id) {
                    return this.sendError(res, new Error('Unauthorized'));
                }
                const profile = await this.companyService.getProfile(id);
                return this.sendSuccess(res, { profile });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateProfile = async (req, res) => {
            try {
                const { id } = req.params;
                if (req.user?.companyId !== id) {
                    return this.sendError(res, new Error('Unauthorized'));
                }
                const profile = await this.companyService.updateProfile(id, req.body);
                return this.sendSuccess(res, { profile });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Verification (Admin only typically, or self-initiate)
        this.verifyByEmail = async (req, res) => {
            // Logic for verifying token would go here, often handled by AuthService or VerificationService
            // For now, placeholder or specific implementation if needed
            return this.sendSuccess(res, { message: 'Not implemented in this controller yet' });
        };
        // Settings
        this.getJobAssignmentSettings = async (req, res) => {
            try {
                const { id } = req.params;
                if (req.user?.companyId !== id) {
                    return this.sendError(res, new Error('Unauthorized'));
                }
                const settings = await this.companyService.getJobAssignmentSettings(id);
                return this.sendSuccess(res, settings);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateJobAssignmentMode = async (req, res) => {
            try {
                const { id } = req.params;
                if (req.user?.companyId !== id) {
                    return this.sendError(res, new Error('Unauthorized'));
                }
                const { mode } = req.body;
                const company = await this.companyService.updateJobAssignmentMode(id, mode);
                return this.sendSuccess(res, { company });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getStats = async (req, res) => {
            try {
                const { id } = req.params;
                if (req.user?.companyId !== id) {
                    return this.sendError(res, new Error('Unauthorized'));
                }
                const stats = await company_stats_service_1.companyStatsService.getCompanyStats(id);
                return this.sendSuccess(res, stats);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Transactions
        this.getTransactions = async (req, res) => {
            try {
                const companyId = req.user?.companyId;
                if (!companyId) {
                    return this.sendError(res, new Error('Unauthorized'));
                }
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const transactions = await this.companyService.getTransactions(companyId, limit, offset);
                return this.sendSuccess(res, { transactions, limit, offset });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getTransactionStats = async (req, res) => {
            try {
                const companyId = req.user?.companyId;
                if (!companyId) {
                    return this.sendError(res, new Error('Unauthorized'));
                }
                const stats = await this.companyService.getTransactionStats(companyId);
                return this.sendSuccess(res, stats);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Refund Requests
        this.createRefundRequest = async (req, res) => {
            try {
                const companyId = req.user?.companyId;
                if (!companyId) {
                    return this.sendError(res, new Error('Unauthorized'));
                }
                const { amount, reason, description, invoiceNumber } = req.body;
                const refundRequest = await this.companyService.createRefundRequest(companyId, {
                    amount,
                    reason,
                    description,
                    invoiceNumber
                });
                res.status(201);
                return this.sendSuccess(res, { refundRequest });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getRefundRequests = async (req, res) => {
            try {
                const companyId = req.user?.companyId;
                if (!companyId) {
                    return this.sendError(res, new Error('Unauthorized'));
                }
                const limit = parseInt(req.query.limit) || 50;
                const offset = parseInt(req.query.offset) || 0;
                const refundRequests = await this.companyService.getRefundRequests(companyId, limit, offset);
                return this.sendSuccess(res, { refundRequests, limit, offset });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.cancelRefundRequest = async (req, res) => {
            try {
                const { id } = req.params;
                const companyId = req.user?.companyId;
                if (!companyId) {
                    return this.sendError(res, new Error('Unauthorized'));
                }
                const result = await this.companyService.cancelRefundRequest(id, companyId);
                return this.sendSuccess(res, { message: 'Refund request cancelled', result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.withdrawRefundRequest = async (req, res) => {
            try {
                const { id } = req.params;
                const companyId = req.user?.companyId;
                if (!companyId) {
                    return this.sendError(res, new Error('Unauthorized'));
                }
                const refundRequest = await this.companyService.withdrawRefundRequest(id, companyId);
                return this.sendSuccess(res, { refundRequest });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.companyService = new company_service_1.CompanyService(new company_repository_1.CompanyRepository());
    }
}
exports.CompanyController = CompanyController;
