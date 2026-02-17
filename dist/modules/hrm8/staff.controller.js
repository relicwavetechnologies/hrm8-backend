"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffController = void 0;
const controller_1 = require("../../core/controller");
const staff_service_1 = require("./staff.service");
const staff_repository_1 = require("./staff.repository");
const env_1 = require("../../config/env");
const token_1 = require("../../utils/token");
class StaffController extends controller_1.BaseController {
    constructor() {
        super();
        this.getAll = async (req, res) => {
            try {
                const { regionId, role, status } = req.query;
                const result = await this.staffService.getAll({
                    regionId: regionId,
                    regionIds: req.assignedRegionIds,
                    role: role,
                    status: status,
                });
                return this.sendSuccess(res, { consultants: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getOverview = async (req, res) => {
            try {
                const { regionId } = req.query;
                const result = await this.staffService.getOverview({
                    regionId: regionId,
                    regionIds: req.assignedRegionIds,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getById = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.staffService.getById(id);
                return this.sendSuccess(res, { consultant: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.create = async (req, res) => {
            try {
                const result = await this.staffService.create(req.body);
                return this.sendSuccess(res, { consultant: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.update = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.staffService.update(id, req.body);
                return this.sendSuccess(res, { consultant: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.assignRegion = async (req, res) => {
            try {
                const { id } = req.params;
                const { regionId } = req.body;
                const result = await this.staffService.assignRegion(id, regionId);
                return this.sendSuccess(res, { consultant: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.suspend = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.staffService.suspend(id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.reactivate = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.staffService.reactivate(id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.delete = async (req, res) => {
            try {
                const { id } = req.params;
                await this.staffService.delete(id);
                return this.sendSuccess(res, { message: 'Consultant deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.generateEmail = async (req, res) => {
            try {
                const { firstName, lastName, consultantId } = req.body;
                const result = await this.staffService.generateEmail(firstName, lastName, consultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.reassignJobs = async (req, res) => {
            try {
                const { id } = req.params;
                const { targetConsultantId } = req.body;
                const result = await this.staffService.reassignJobs(id, targetConsultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getPendingTasks = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.staffService.getPendingTasks(id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getReassignmentOptions = async (req, res) => {
            try {
                const { id } = req.params;
                const consultant = await this.staffService.getById(id);
                const result = await this.staffService.getConsultantsForReassignment(id, consultant.role, consultant.regionId);
                return this.sendSuccess(res, { consultants: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.changeRole = async (req, res) => {
            try {
                const { id } = req.params;
                const { role, taskAction, targetConsultantId } = req.body;
                const result = await this.staffService.changeRoleWithTaskHandling(id, role, taskAction, targetConsultantId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.invite = async (req, res) => {
            try {
                const { id } = req.params;
                const token = (0, token_1.generateInvitationToken)();
                const baseUrl = env_1.env.FRONTEND_URL || 'http://localhost:3000';
                const inviteLink = `${baseUrl}/consultant/setup-account?token=${token}&consultantId=${id}`;
                return this.sendSuccess(res, {
                    message: 'Invitation link generated',
                    data: { inviteLink }
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.staffService = new staff_service_1.StaffService(new staff_repository_1.StaffRepository());
    }
}
exports.StaffController = StaffController;
