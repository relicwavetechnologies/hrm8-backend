import { Response } from 'express';
import { IntegrationStatus, IntegrationType, Prisma } from '@prisma/client';
import { BaseController } from '../../core/controller';
import { Hrm8AuthenticatedRequest } from '../../types';
import { prisma } from '../../utils/prisma';

type GlobalConfigPayload = {
    id?: string;
    provider?: string;
    name?: string;
    category?: string;
    api_key?: string;
    api_secret?: string;
    endpoint_url?: string;
    config?: Record<string, unknown>;
    is_active?: boolean;
};

const mapCategoryToType = (category?: string): IntegrationType => {
    switch ((category || '').toLowerCase()) {
        case 'email':
            return IntegrationType.EMAIL_PROVIDER;
        case 'job_board':
            return IntegrationType.JOB_POSTING_PLATFORM;
        case 'assessment':
            return IntegrationType.ASSESSMENT_TOOL;
        case 'calendar':
            return IntegrationType.CALENDAR;
        case 'accounting':
        case 'payroll':
            return IntegrationType.ACCOUNTING_SYSTEM;
        default:
            return IntegrationType.OTHER;
    }
};

const mapTypeToCategory = (type: IntegrationType): string => {
    switch (type) {
        case IntegrationType.EMAIL_PROVIDER:
            return 'email';
        case IntegrationType.JOB_POSTING_PLATFORM:
            return 'job_board';
        case IntegrationType.ASSESSMENT_TOOL:
            return 'assessment';
        case IntegrationType.CALENDAR:
            return 'calendar';
        case IntegrationType.ACCOUNTING_SYSTEM:
            return 'accounting';
        default:
            return 'other';
    }
};

const normalizeGlobalIntegration = (integration: any) => {
    const config = (integration.config || {}) as Record<string, unknown>;
    return {
        id: integration.id,
        provider: String(config.provider || integration.name || '').trim(),
        name: integration.name,
        category: String(config.category || mapTypeToCategory(integration.type)),
        api_key: integration.api_key,
        api_secret: integration.api_secret,
        endpoint_url: String(config.endpoint_url || integration.login_url || ''),
        config,
        is_active: integration.status === IntegrationStatus.ACTIVE,
        created_at: integration.created_at,
        updated_at: integration.updated_at,
    };
};

export class Hrm8IntegrationsController extends BaseController {
    getCatalog = async (_req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const integrations = await prisma.integration.findMany({
                where: { company_id: null },
                orderBy: { updated_at: 'desc' },
            });

            return this.sendSuccess(res, {
                integrations: integrations.map(normalizeGlobalIntegration),
            });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    upsertGlobalConfig = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const body = (req.body || {}) as GlobalConfigPayload;
            const name = String(body.name || body.provider || '').trim();
            if (!name) return this.sendError(res, new Error('Name is required'), 400);

            const provider = String(body.provider || name).trim();
            const category = String(body.category || 'other').trim().toLowerCase();

            const nextConfig: Record<string, unknown> = {
                ...(body.config || {}),
                provider,
                category,
                endpoint_url: body.endpoint_url || '',
            };

            const payload: Prisma.IntegrationUncheckedCreateInput = {
                company_id: null,
                hrm8_user_id: req.hrm8User?.id || null,
                consultant_id: null,
                name,
                type: mapCategoryToType(category),
                status: body.is_active === false ? IntegrationStatus.INACTIVE : IntegrationStatus.ACTIVE,
                api_key: body.api_key || null,
                api_secret: body.api_secret || null,
                login_url: body.endpoint_url || null,
                config: nextConfig as Prisma.InputJsonValue,
            };

            let integration: any;
            if (body.id) {
                integration = await prisma.integration.update({
                    where: { id: body.id },
                    data: payload,
                });
            } else {
                const existing = await prisma.integration.findFirst({
                    where: { company_id: null, name },
                    orderBy: { updated_at: 'desc' },
                });
                integration = existing
                    ? await prisma.integration.update({ where: { id: existing.id }, data: payload })
                    : await prisma.integration.create({ data: payload });
            }

            return this.sendSuccess(res, {
                integration: normalizeGlobalIntegration(integration),
            });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getUsage = async (_req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const usage = await prisma.integration.groupBy({
                by: ['type'],
                where: { status: IntegrationStatus.ACTIVE },
                _count: { id: true },
            });
            return this.sendSuccess(res, { usage });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getCompanyIntegrations = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const companyId = req.params.companyId as string;
            const integrations = await prisma.integration.findMany({
                where: { company_id: companyId },
                orderBy: { updated_at: 'desc' },
            });
            return this.sendSuccess(res, { integrations });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    createCompanyIntegration = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const companyId = req.params.companyId as string;
            const body = req.body || {};
            const integration = await prisma.integration.create({
                data: {
                    company_id: companyId,
                    hrm8_user_id: req.hrm8User?.id || null,
                    name: body.name,
                    type: body.type || IntegrationType.OTHER,
                    status: body.status || IntegrationStatus.ACTIVE,
                    api_key: body.api_key || null,
                    api_secret: body.api_secret || null,
                    login_url: body.login_url || null,
                    username: body.username || null,
                    password: body.password || null,
                    config: body.config || null,
                },
            });
            return this.sendSuccess(res, { integration });
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    updateCompanyIntegration = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const companyId = req.params.companyId as string;
            const id = req.params.id as string;
            const body = req.body || {};

            const existing = await prisma.integration.findFirst({ where: { id, company_id: companyId } });
            if (!existing) return this.sendError(res, new Error('Integration not found'), 404);

            const integration = await prisma.integration.update({
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
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    deleteCompanyIntegration = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const companyId = req.params.companyId as string;
            const id = req.params.id as string;
            const existing = await prisma.integration.findFirst({ where: { id, company_id: companyId } });
            if (!existing) return this.sendError(res, new Error('Integration not found'), 404);

            await prisma.integration.delete({ where: { id } });
            return this.sendSuccess(res, { message: 'Integration removed' });
        } catch (error) {
            return this.sendError(res, error);
        }
    };
}
