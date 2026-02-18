"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationService = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
class IntegrationService extends service_1.BaseService {
    constructor(integrationRepository) {
        super();
        this.integrationRepository = integrationRepository;
    }
    async configureIntegration(companyId, type, config, name) {
        const existing = await this.integrationRepository.findByCompanyAndType(companyId, type);
        if (existing) {
            return this.integrationRepository.update(existing.id, {
                config,
                status: 'ACTIVE',
                updated_at: new Date()
            });
        }
        return this.integrationRepository.create({
            company: { connect: { id: companyId } },
            type,
            name,
            config,
            status: 'ACTIVE',
        });
    }
    async getIntegration(id, companyId) {
        const integration = await this.integrationRepository.findById(id);
        if (!integration)
            throw new http_exception_1.HttpException(404, 'Integration not found');
        if (integration.company_id !== companyId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        return integration;
    }
    async getCompanyIntegrations(companyId) {
        return this.integrationRepository.findAllByCompany(companyId);
    }
    async removeIntegration(id, companyId) {
        const integration = await this.integrationRepository.findById(id);
        if (!integration)
            throw new http_exception_1.HttpException(404, 'Integration not found');
        if (integration.company_id !== companyId)
            throw new http_exception_1.HttpException(403, 'Unauthorized');
        return this.integrationRepository.delete(id);
    }
}
exports.IntegrationService = IntegrationService;
