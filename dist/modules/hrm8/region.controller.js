"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionController = void 0;
const controller_1 = require("../../core/controller");
const region_service_1 = require("./region.service");
const region_repository_1 = require("./region.repository");
class RegionController extends controller_1.BaseController {
    constructor() {
        super();
        this.getAll = async (req, res) => {
            try {
                const { ownerType, licenseeId, country, isActive } = req.query;
                const result = await this.regionService.getAll({
                    ownerType: ownerType,
                    licenseeId: licenseeId,
                    country: country,
                    isActive: isActive,
                    regionIds: req.assignedRegionIds,
                });
                return this.sendSuccess(res, { regions: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getById = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.regionService.getById(id, {
                    regionIds: req.assignedRegionIds,
                    role: req.hrm8User?.role,
                });
                return this.sendSuccess(res, { region: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getOverview = async (req, res) => {
            try {
                const result = await this.regionService.getOverview({
                    regionIds: req.assignedRegionIds,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.create = async (req, res) => {
            try {
                const result = await this.regionService.create(req.body, req.hrm8User?.id);
                return this.sendSuccess(res, { region: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.update = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.regionService.update(id, req.body, req.hrm8User?.id);
                return this.sendSuccess(res, { region: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.delete = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.regionService.delete(id, req.hrm8User?.id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.assignLicensee = async (req, res) => {
            try {
                const { regionId } = req.params;
                const { licenseeId } = req.body;
                const result = await this.regionService.assignLicensee(regionId, licenseeId, req.hrm8User?.id);
                return this.sendSuccess(res, { region: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.unassignLicensee = async (req, res) => {
            try {
                const { regionId } = req.params;
                const result = await this.regionService.unassignLicensee(regionId, req.hrm8User?.id);
                return this.sendSuccess(res, { region: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getTransferImpact = async (req, res) => {
            try {
                const { regionId } = req.params;
                const result = await this.regionService.getTransferImpact(regionId);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.transferOwnership = async (req, res) => {
            try {
                if (req.hrm8User?.role !== 'GLOBAL_ADMIN') {
                    return this.sendError(res, new Error('Access denied. Required roles: GLOBAL_ADMIN'), 403);
                }
                const { regionId } = req.params;
                const { targetLicenseeId, auditNote } = req.body;
                const result = await this.regionService.transferOwnership(regionId, targetLicenseeId, auditNote, req.hrm8User?.id);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.regionService = new region_service_1.RegionService(new region_repository_1.RegionRepository());
    }
}
exports.RegionController = RegionController;
