"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionalLicenseeController = void 0;
const controller_1 = require("../../core/controller");
const regional_licensee_service_1 = require("./regional-licensee.service");
const regional_licensee_repository_1 = require("./regional-licensee.repository");
class RegionalLicenseeController extends controller_1.BaseController {
    constructor() {
        super();
        this.getAll = async (req, res) => {
            try {
                const { status, limit, offset } = req.query;
                const result = await this.regionalLicenseeService.getAll({
                    status: status,
                    limit: limit ? Number(limit) : undefined,
                    offset: offset ? Number(offset) : undefined,
                    role: req.hrm8User?.role,
                    licenseeId: req.hrm8User?.licenseeId,
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
                const result = await this.regionalLicenseeService.getById(id, {
                    role: req.hrm8User?.role,
                    licenseeId: req.hrm8User?.licenseeId,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.create = async (req, res) => {
            try {
                const result = await this.regionalLicenseeService.create(req.body, req.hrm8User?.id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.update = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.regionalLicenseeService.update(id, req.body, req.hrm8User?.id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.delete = async (req, res) => {
            try {
                const { id } = req.params;
                await this.regionalLicenseeService.delete(id, req.hrm8User?.id);
                return this.sendSuccess(res, { message: 'Licensee deleted successfully' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getStats = async (req, res) => {
            try {
                const result = await this.regionalLicenseeService.getStats({
                    role: req.hrm8User?.role,
                    licenseeId: req.hrm8User?.licenseeId,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getOverview = async (req, res) => {
            try {
                const result = await this.regionalLicenseeService.getOverview({
                    role: req.hrm8User?.role,
                    licenseeId: req.hrm8User?.licenseeId,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateStatus = async (req, res) => {
            try {
                const { id } = req.params;
                const { status, notes } = req.body;
                const result = await this.regionalLicenseeService.updateStatus(id, status, req.hrm8User?.id, notes);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.suspend = async (req, res) => {
            try {
                const { id } = req.params;
                const { notes } = req.body;
                const result = await this.regionalLicenseeService.suspend(id, req.hrm8User?.id, notes);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.reactivate = async (req, res) => {
            try {
                const { id } = req.params;
                const { notes } = req.body;
                const result = await this.regionalLicenseeService.reactivate(id, req.hrm8User?.id, notes);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.terminate = async (req, res) => {
            try {
                const { id } = req.params;
                const { notes } = req.body;
                const result = await this.regionalLicenseeService.terminate(id, req.hrm8User?.id, notes);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getImpactPreview = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.regionalLicenseeService.getImpactPreview(id, {
                    role: req.hrm8User?.role,
                    licenseeId: req.hrm8User?.licenseeId,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.regionalLicenseeService = new regional_licensee_service_1.RegionalLicenseeService(new regional_licensee_repository_1.RegionalLicenseeRepository());
    }
}
exports.RegionalLicenseeController = RegionalLicenseeController;
