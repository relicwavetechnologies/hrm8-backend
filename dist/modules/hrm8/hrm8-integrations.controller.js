"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hrm8IntegrationsController = void 0;
const client_1 = require("@prisma/client");
const controller_1 = require("../../core/controller");
const prisma_1 = require("../../utils/prisma");
const mapCategoryToType = (category) => {
    switch ((category || '').toLowerCase()) {
        case 'email':
            return client_1.IntegrationType.EMAIL_PROVIDER;
        case 'job_board':
            return client_1.IntegrationType.JOB_POSTING_PLATFORM;
        case 'assessment':
            return client_1.IntegrationType.ASSESSMENT_TOOL;
        case 'calendar':
            return client_1.IntegrationType.CALENDAR;
        case 'accounting':
        case 'payroll':
            return client_1.IntegrationType.ACCOUNTING_SYSTEM;
        default:
            return client_1.IntegrationType.OTHER;
    }
};
const mapTypeToCategory = (type) => {
    switch (type) {
        case client_1.IntegrationType.EMAIL_PROVIDER:
            return 'email';
        case client_1.IntegrationType.JOB_POSTING_PLATFORM:
            return 'job_board';
        case client_1.IntegrationType.ASSESSMENT_TOOL:
            return 'assessment';
        case client_1.IntegrationType.CALENDAR:
            return 'calendar';
        case client_1.IntegrationType.ACCOUNTING_SYSTEM:
            return 'accounting';
        default:
            return 'other';
    }
};
const normalizeGlobalIntegration = (integration) => {
    const config = (integration.config || {});
    return {
        id: integration.id,
        provider: String(config.provider || integration.name || '').trim(),
        name: integration.name,
        category: String(config.category || mapTypeToCategory(integration.type)),
        api_key: integration.api_key,
        api_secret: integration.api_secret,
        endpoint_url: String(config.endpoint_url || integration.login_url || ''),
        config,
        is_active: integration.status === client_1.IntegrationStatus.ACTIVE,
        created_at: integration.created_at,
        updated_at: integration.updated_at,
    };
};
class Hrm8IntegrationsController extends controller_1.BaseController {
    constructor() {
        super(...arguments);
        this.getCatalog = async (_req, res) => {
            try {
                const integrations = await prisma_1.prisma.integration.findMany({
                    where: { company_id: null },
                    orderBy: { updated_at: 'desc' },
                });
                return this.sendSuccess(res, {
                    integrations: integrations.map(normalizeGlobalIntegration),
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.upsertGlobalConfig = async (req, res) => {
            try {
                const body = (req.body || {});
                const name = String(body.name || body.provider || '').trim();
                if (!name)
                    return this.sendError(res, new Error('Name is required'), 400);
                const provider = String(body.provider || name).trim();
                const category = String(body.category || 'other').trim().toLowerCase();
                const nextConfig = {
                    ...(body.config || {}),
                    provider,
                    category,
                    endpoint_url: body.endpoint_url || '',
                };
                const payload = {
                    company_id: null,
                    hrm8_user_id: req.hrm8User?.id || null,
                    consultant_id: null,
                    name,
                    type: mapCategoryToType(category),
                    status: body.is_active === false ? client_1.IntegrationStatus.INACTIVE : client_1.IntegrationStatus.ACTIVE,
                    api_key: body.api_key || null,
                    api_secret: body.api_secret || null,
                    login_url: body.endpoint_url || null,
                    config: nextConfig,
                };
                let integration;
                if (body.id) {
                    integration = await prisma_1.prisma.integration.update({
                        where: { id: body.id },
                        data: payload,
                    });
                }
                else {
                    const existing = await prisma_1.prisma.integration.findFirst({
                        where: { company_id: null, name },
                        orderBy: { updated_at: 'desc' },
                    });
                    integration = existing
                        ? await prisma_1.prisma.integration.update({ where: { id: existing.id }, data: payload })
                        : await prisma_1.prisma.integration.create({ data: payload });
                }
                return this.sendSuccess(res, {
                    integration: normalizeGlobalIntegration(integration),
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getUsage = async (_req, res) => {
            try {
                const usage = await prisma_1.prisma.integration.groupBy({
                    by: ['type'],
                    where: { status: client_1.IntegrationStatus.ACTIVE },
                    _count: { id: true },
                });
                return this.sendSuccess(res, { usage });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getCompanyIntegrations = async (req, res) => {
            try {
                const companyId = req.params.companyId;
                const integrations = await prisma_1.prisma.integration.findMany({
                    where: { company_id: companyId },
                    orderBy: { updated_at: 'desc' },
                });
                return this.sendSuccess(res, { integrations });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.createCompanyIntegration = async (req, res) => {
            try {
                const companyId = req.params.companyId;
                const body = req.body || {};
                const integration = await prisma_1.prisma.integration.create({
                    data: {
                        company_id: companyId,
                        hrm8_user_id: req.hrm8User?.id || null,
                        name: body.name,
                        type: body.type || client_1.IntegrationType.OTHER,
                        status: body.status || client_1.IntegrationStatus.ACTIVE,
                        api_key: body.api_key || null,
                        api_secret: body.api_secret || null,
                        login_url: body.login_url || null,
                        username: body.username || null,
                        password: body.password || null,
                        config: body.config || null,
                    },
                });
                return this.sendSuccess(res, { integration });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.updateCompanyIntegration = async (req, res) => {
            try {
                const companyId = req.params.companyId;
                const id = req.params.id;
                const body = req.body || {};
                const existing = await prisma_1.prisma.integration.findFirst({ where: { id, company_id: companyId } });
                if (!existing)
                    return this.sendError(res, new Error('Integration not found'), 404);
                const integration = await prisma_1.prisma.integration.update({
                    where: { id },
                    data: {
                        name: body.name ?? existing.name,
                        type: body.type ?? existing.type,
                        status: body.status ?? existing.status,
                        api_key: body.api_key ?? existing.api_key,
                        api_secret: body.api_secret ?? existing.api_secret,
                        login_url: body.login_url ?? existing.login_url,
                        username: body.username ?? existing.username,
                        password: body.password ?? existing.password,
                        config: body.config ?? existing.config,
                    },
                });
                return this.sendSuccess(res, { integration });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.deleteCompanyIntegration = async (req, res) => {
            try {
                const companyId = req.params.companyId;
                const id = req.params.id;
                const existing = await prisma_1.prisma.integration.findFirst({ where: { id, company_id: companyId } });
                if (!existing)
                    return this.sendError(res, new Error('Integration not found'), 404);
                await prisma_1.prisma.integration.delete({ where: { id } });
                return this.sendSuccess(res, { message: 'Integration removed' });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.Hrm8IntegrationsController = Hrm8IntegrationsController;
