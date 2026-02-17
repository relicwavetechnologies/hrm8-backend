"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareersRequestController = void 0;
const controller_1 = require("../../core/controller");
const careers_request_service_1 = require("./careers-request.service");
const careers_request_repository_1 = require("./careers-request.repository");
class CareersRequestController extends controller_1.BaseController {
    constructor() {
        super();
        this.getRequests = async (req, res) => {
            try {
                const result = await this.careersRequestService.getRequests();
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.approve = async (req, res) => {
            try {
                const { id } = req.params;
                const { section } = req.body;
                const result = await this.careersRequestService.approve(id, section);
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
                const result = await this.careersRequestService.reject(id, reason);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.careersRequestService = new careers_request_service_1.CareersRequestService(new careers_request_repository_1.CareersRequestRepository());
    }
}
exports.CareersRequestController = CareersRequestController;
