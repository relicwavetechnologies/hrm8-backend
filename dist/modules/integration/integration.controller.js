"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationController = void 0;
const controller_1 = require("../../core/controller");
const integration_service_1 = require("./integration.service");
const integration_repository_1 = require("./integration.repository");
class IntegrationController extends controller_1.BaseController {
    constructor() {
        super();
        this.configure = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { type, config, name } = req.body;
                const integration = await this.integrationService.configureIntegration(req.user.companyId, type, config, name || type);
                return this.sendSuccess(res, { integration });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.list = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const integrations = await this.integrationService.getCompanyIntegrations(req.user.companyId);
                return this.sendSuccess(res, { integrations });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.remove = async (req, res) => {
            try {
                if (!req.user)
                    return this.sendError(res, new Error('Not authenticated'));
                const { id } = req.params;
                await this.integrationService.removeIntegration(id, req.user.companyId);
                return this.sendSuccess(res, { message: 'Integration removed' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.integrationService = new integration_service_1.IntegrationService(new integration_repository_1.IntegrationRepository());
    }
}
exports.IntegrationController = IntegrationController;
