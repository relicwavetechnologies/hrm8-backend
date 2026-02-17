"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogController = void 0;
const controller_1 = require("../../core/controller");
const audit_log_service_1 = require("./audit-log.service");
const audit_log_repository_1 = require("./audit-log.repository");
class AuditLogController extends controller_1.BaseController {
    constructor() {
        super();
        this.getRecent = async (req, res) => {
            try {
                const { entityType, action, actorId, limit, offset } = req.query;
                const result = await this.auditLogService.getRecent({
                    entityType: entityType,
                    action: action,
                    actorId: actorId,
                    limit: limit ? parseInt(limit, 10) : 50,
                    offset: offset ? parseInt(offset, 10) : 0,
                });
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getByEntity = async (req, res) => {
            try {
                const { entityType, entityId } = req.params;
                const { limit } = req.query;
                const logs = await this.auditLogService.getByEntity(entityType, entityId, limit ? parseInt(limit, 10) : 50);
                return this.sendSuccess(res, { logs });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getStats = async (req, res) => {
            try {
                const stats = await this.auditLogService.getStats();
                return this.sendSuccess(res, stats);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.auditLogService = new audit_log_service_1.AuditLogService(new audit_log_repository_1.AuditLogRepository());
    }
}
exports.AuditLogController = AuditLogController;
