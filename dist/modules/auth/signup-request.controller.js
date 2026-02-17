"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignupRequestController = void 0;
const controller_1 = require("../../core/controller");
const signup_request_service_1 = require("./signup-request.service");
const signup_request_repository_1 = require("./signup-request.repository");
const auth_repository_1 = require("./auth.repository");
class SignupRequestController extends controller_1.BaseController {
    constructor() {
        super();
        this.getPending = async (req, res) => {
            try {
                const companyId = req.user.companyId;
                const requests = await this.signupRequestService.getPendingRequests(companyId);
                return this.sendSuccess(res, requests);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getAll = async (req, res) => {
            try {
                const companyId = req.user.companyId;
                const requests = await this.signupRequestService.getAllRequests(companyId);
                return this.sendSuccess(res, requests);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.approve = async (req, res) => {
            try {
                const { id } = req.params;
                const reviewerId = req.user.id;
                const result = await this.signupRequestService.approveRequest(id, reviewerId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.reject = async (req, res) => {
            try {
                const { id } = req.params;
                const { reason } = req.body;
                const reviewerId = req.user.id;
                const result = await this.signupRequestService.rejectRequest(id, reviewerId, reason);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.signupRequestService = new signup_request_service_1.SignupRequestService(new signup_request_repository_1.SignupRequestRepository(), new auth_repository_1.AuthRepository());
    }
}
exports.SignupRequestController = SignupRequestController;
