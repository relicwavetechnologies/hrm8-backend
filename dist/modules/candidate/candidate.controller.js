"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateController = void 0;
const controller_1 = require("../../core/controller");
const candidate_service_1 = require("./candidate.service");
const candidate_repository_1 = require("./candidate.repository");
const session_1 = require("../../utils/session");
class CandidateController extends controller_1.BaseController {
    constructor() {
        super();
        // Auth
        this.register = async (req, res) => {
            try {
                const { email, password, firstName, lastName } = req.body;
                const result = await this.candidateService.register({ email, password, firstName, lastName });
                return this.sendSuccess(res, { message: 'Registration successful', email: result.candidate.email });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.login = async (req, res) => {
            try {
                const { email, password } = req.body;
                const { candidate, sessionId } = await this.candidateService.login({ email, password });
                res.cookie('candidateSessionId', sessionId, (0, session_1.getSessionCookieOptions)());
                return this.sendSuccess(res, { candidate });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.verifyEmail = async (req, res) => {
            try {
                const { token } = req.query;
                if (!token || typeof token !== 'string') {
                    return this.sendError(res, new Error('Invalid token'));
                }
                const { candidate, sessionId } = await this.candidateService.verifyEmail(token);
                res.cookie('candidateSessionId', sessionId, (0, session_1.getSessionCookieOptions)());
                return this.sendSuccess(res, { message: 'Email verified', candidate });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.logout = async (req, res) => {
            try {
                const sessionId = req.cookies?.candidateSessionId;
                if (sessionId) {
                    await this.candidateService.logout(sessionId);
                }
                res.clearCookie('candidateSessionId', (0, session_1.getSessionCookieOptions)());
                return this.sendSuccess(res, { message: 'Logged out successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getProfile = async (req, res) => {
            try {
                if (!req.candidate) {
                    return this.sendError(res, new Error('Not authenticated'));
                }
                const profile = await this.candidateService.getProfile(req.candidate.id);
                return this.sendSuccess(res, { profile });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateProfile = async (req, res) => {
            try {
                if (!req.candidate) {
                    return this.sendError(res, new Error('Not authenticated'));
                }
                const profile = await this.candidateService.updateProfile(req.candidate.id, req.body);
                return this.sendSuccess(res, { profile });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updatePassword = async (req, res) => {
            try {
                if (!req.candidate) {
                    return this.sendError(res, new Error('Not authenticated'));
                }
                const { currentPassword, newPassword } = req.body;
                await this.candidateService.updatePassword(req.candidate.id, currentPassword, newPassword);
                return this.sendSuccess(res, { message: 'Password updated successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.exportData = async (req, res) => {
            try {
                if (!req.candidate) {
                    return this.sendError(res, new Error('Not authenticated'));
                }
                const data = await this.candidateService.exportCandidateData(req.candidate.id);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename=candidate-data-${req.candidate.id}.json`);
                return res.json(data);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteAccount = async (req, res) => {
            try {
                if (!req.candidate) {
                    return this.sendError(res, new Error('Not authenticated'));
                }
                const { password } = req.body;
                await this.candidateService.deleteAccount(req.candidate.id, password);
                // Clear cookie
                res.clearCookie('candidateSessionId');
                return this.sendSuccess(res, { message: 'Account deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Work Experience
        this.getWorkHistory = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const workHistory = await this.candidateService.getWorkHistory(req.candidate.id);
                return this.sendSuccess(res, { workHistory });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.addWorkExperience = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const workExperience = await this.candidateService.addWorkExperience(req.candidate.id, req.body);
                return this.sendSuccess(res, { workExperience });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateWorkExperience = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                const workExperience = await this.candidateService.updateWorkExperience(req.candidate.id, id, req.body);
                return this.sendSuccess(res, { workExperience });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteWorkExperience = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                await this.candidateService.deleteWorkExperience(req.candidate.id, id);
                return this.sendSuccess(res, { message: 'Work experience deleted' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // Skills
        this.getSkills = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const skills = await this.candidateService.getSkills(req.candidate.id);
                return this.sendSuccess(res, { skills });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateSkills = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const skills = await this.candidateService.updateSkills(req.candidate.id, req.body.skills);
                return this.sendSuccess(res, { skills });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.candidateService = new candidate_service_1.CandidateService(new candidate_repository_1.CandidateRepository());
    }
}
exports.CandidateController = CandidateController;
