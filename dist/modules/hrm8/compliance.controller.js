"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceController = void 0;
const controller_1 = require("../../core/controller");
const compliance_service_1 = require("./compliance.service");
const compliance_repository_1 = require("./compliance.repository");
const audit_log_service_1 = require("./audit-log.service");
const audit_log_repository_1 = require("./audit-log.repository");
class ComplianceController extends controller_1.BaseController {
    constructor() {
        super();
        this.getAlerts = async (req, res) => {
            try {
                const result = await this.complianceService.getAllAlerts();
                return this.sendSuccess(res, { alerts: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getAlertSummary = async (req, res) => {
            try {
                const result = await this.complianceService.getAlertSummary();
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getAuditHistory = async (req, res) => {
            try {
                const { entityType, entityId } = req.params;
                const limit = parseInt(req.query.limit) || 50;
                const entityTypeStr = entityType.toUpperCase();
                const validEntityTypes = ['LICENSEE', 'REGION', 'CONSULTANT', 'SETTLEMENT', 'JOB'];
                if (!validEntityTypes.includes(entityTypeStr)) {
                    return this.sendError(res, new Error(`Invalid entity type. Must be one of: ${validEntityTypes.join(', ')}`), 400);
                }
                const history = await this.complianceService.getAuditHistory(entityTypeStr, entityId, limit);
                return this.sendSuccess(res, { history });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getRecentAudit = async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 100;
                const entries = await this.complianceService.getRecentAudit(limit);
                // Service returns { logs, total } so adjust response if needed
                // Correcting expectation: AuditLogService.getRecent returns { logs, total }
                // Old controller returned { data: { entries } } where entries was likely array.
                // Let's stick to standard { success: true, data: { entries } } wrapper via sendSuccess
                return this.sendSuccess(res, { entries });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.complianceService = new compliance_service_1.ComplianceService(new compliance_repository_1.ComplianceRepository(), new audit_log_service_1.AuditLogService(new audit_log_repository_1.AuditLogRepository()));
    }
}
exports.ComplianceController = ComplianceController;
