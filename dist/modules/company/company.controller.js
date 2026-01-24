"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyController = exports.CompanyController = void 0;
const controller_1 = require("../../core/controller");
const verification_service_1 = require("../verification/verification.service");
class CompanyController extends controller_1.BaseController {
    constructor(companyService = companyService, verificationServiceRef = verification_service_1.verificationService, companyProfileService = companyProfileService, companyStatsService = companyStatsService, companyRepository = companyRepository) {
        super();
        this.companyService = companyService;
        this.verificationServiceRef = verificationServiceRef;
        this.companyProfileService = companyProfileService;
        this.companyStatsService = companyStatsService;
        this.companyRepository = companyRepository;
        this.getCompany = async (req, res) => {
            try {
                const id = req.params.id;
                const company = await this.companyService.findById(id);
                if (!company) {
                    return res.status(404).json({ success: false, error: 'Company not found' });
                }
                return this.sendSuccess(res, company);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getVerificationStatus = async (req, res) => {
            try {
                const id = req.params.id;
                const status = await this.companyService.getVerificationStatus(id);
                if (status === null) {
                    return res.status(404).json({ success: false, error: 'Company not found' });
                }
                return this.sendSuccess(res, { status });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.verifyByEmail = async (req, res) => {
            try {
                const id = req.params.id;
                const { token } = req.body;
                const verified = await this.verificationServiceRef.verifyByEmailToken(id, token);
                if (!verified) {
                    return res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
                }
                return this.sendSuccess(res, { message: 'Company verified successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.initiateManualVerification = async (req, res) => {
            try {
                const id = req.params.id;
                const { gstNumber, registrationNumber, linkedInUrl } = req.body;
                await this.verificationServiceRef.initiateManualVerification(id, {
                    gstNumber,
                    registrationNumber,
                    linkedInUrl,
                });
                return this.sendSuccess(res, {
                    message: 'Verification request submitted. Our team will review it shortly.'
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getProfile = async (req, res) => {
            try {
                const id = req.params.id;
                const data = await this.companyProfileService.getProgress(id);
                return this.sendSuccess(res, data);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateProfile = async (req, res) => {
            try {
                const id = req.params.id;
                const payload = req.body;
                const userId = req.user?.id;
                if (!userId) {
                    return res.status(401).json({ success: false, error: 'Not authenticated' });
                }
                const profile = await this.companyProfileService.updateSection(id, payload, userId);
                return this.sendSuccess(res, { profile });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.completeProfile = async (req, res) => {
            try {
                const id = req.params.id;
                const profile = await this.companyProfileService.completeProfile(id);
                return this.sendSuccess(res, {
                    profile,
                    message: 'Company profile completed successfully.',
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getJobAssignmentSettings = async (req, res) => {
            try {
                const id = req.params.id;
                const settings = await this.companyRepository.getJobAssignmentSettings(id);
                return this.sendSuccess(res, settings);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateJobAssignmentMode = async (req, res) => {
            try {
                const id = req.params.id;
                const { mode } = req.body;
                if (!mode || (mode !== 'AUTO_RULES_ONLY' && mode !== 'MANUAL_ONLY')) {
                    return res.status(400).json({ success: false, error: 'Invalid mode' });
                }
                const company = await this.companyRepository.updateJobAssignmentMode(id, mode);
                return this.sendSuccess(res, {
                    company,
                    message: 'Job assignment mode updated successfully',
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getCompanyStats = async (req, res) => {
            try {
                const id = req.params.id;
                if (req.user?.companyId !== id) {
                    return res.status(403).json({
                        success: false,
                        error: 'Unauthorized to access this company\'s statistics',
                    });
                }
                const stats = await this.companyStatsService.getCompanyStats(id);
                return this.sendSuccess(res, stats);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.CompanyController = CompanyController;
exports.companyController = new CompanyController();
