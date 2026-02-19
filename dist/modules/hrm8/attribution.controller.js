"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttributionController = void 0;
const controller_1 = require("../../core/controller");
const prisma_1 = require("../../utils/prisma");
class AttributionController extends controller_1.BaseController {
    constructor() {
        super('hrm8-attribution-controller');
        this.searchCompanies = async (req, res) => {
            try {
                this.ensureHrm8Admin(req);
                const q = String(req.query.q || '').trim();
                const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 20);
                if (!q)
                    return this.sendSuccess(res, { companies: [] });
                const companies = await prisma_1.prisma.company.findMany({
                    where: {
                        OR: [
                            { name: { contains: q, mode: 'insensitive' } },
                            { domain: { contains: q, mode: 'insensitive' } },
                        ],
                    },
                    select: { id: true, name: true, domain: true, region_id: true },
                    orderBy: { updated_at: 'desc' },
                    take: limit,
                });
                return this.sendSuccess(res, {
                    companies: companies.map((company) => ({
                        company_id: company.id,
                        name: company.name,
                        domain: company.domain,
                        region_id: company.region_id,
                    })),
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getAttribution = async (req, res) => {
            try {
                this.ensureHrm8Admin(req);
                const companyId = String(req.params.companyId || '').trim();
                if (!companyId)
                    return this.sendError(res, new Error('companyId is required'), 400);
                const company = await prisma_1.prisma.company.findUnique({
                    where: { id: companyId },
                    select: {
                        id: true,
                        name: true,
                        sales_agent_id: true,
                        referred_by: true,
                        attribution_locked: true,
                        attribution_locked_at: true,
                        created_by: true,
                    },
                });
                if (!company)
                    return this.sendError(res, new Error('Company not found'), 404);
                return this.sendSuccess(res, { attribution: this.mapCompanyAttribution(company) });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getAttributionHistory = async (req, res) => {
            try {
                this.ensureHrm8Admin(req);
                const companyId = String(req.params.companyId || '').trim();
                if (!companyId)
                    return this.sendError(res, new Error('companyId is required'), 400);
                const history = await prisma_1.prisma.auditLog.findMany({
                    where: {
                        entity_type: 'company_attribution',
                        entity_id: companyId,
                    },
                    orderBy: { performed_at: 'desc' },
                });
                const mappedHistory = history.map((entry) => {
                    const changes = (entry.changes || {});
                    const reason = changes.reason || null;
                    const previousSalesAgentId = changes.previous_sales_agent_id || null;
                    const newSalesAgentId = changes.new_sales_agent_id || null;
                    const action = String(changes.action || entry.action || '');
                    return {
                        id: entry.id,
                        company_id: companyId,
                        type: entry.action,
                        subject: action === 'LOCKED' ? 'Attribution locked' : 'Attribution updated',
                        description: entry.description || `Attribution ${action ? action.toLowerCase() : 'changed'}`,
                        attachments: {
                            audit_type: 'ATTRIBUTION',
                            action: action || entry.action,
                            previous_sales_agent_id: previousSalesAgentId,
                            new_sales_agent_id: newSalesAgentId,
                            performed_by: entry.performed_by,
                            reason,
                        },
                        created_at: entry.performed_at.toISOString(),
                    };
                });
                return this.sendSuccess(res, { history: mappedHistory });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.lockAttribution = async (req, res) => {
            try {
                this.ensureHrm8Admin(req);
                const companyId = String(req.params.companyId || '').trim();
                if (!companyId)
                    return this.sendError(res, new Error('companyId is required'), 400);
                const company = await prisma_1.prisma.company.findUnique({
                    where: { id: companyId },
                    select: {
                        id: true,
                        name: true,
                        sales_agent_id: true,
                        referred_by: true,
                        attribution_locked: true,
                        attribution_locked_at: true,
                        created_by: true,
                    },
                });
                if (!company)
                    return this.sendError(res, new Error('Company not found'), 404);
                const updated = await prisma_1.prisma.company.update({
                    where: { id: companyId },
                    data: {
                        attribution_locked: true,
                        attribution_locked_at: new Date(),
                    },
                    select: {
                        id: true,
                        name: true,
                        sales_agent_id: true,
                        referred_by: true,
                        attribution_locked: true,
                        attribution_locked_at: true,
                        created_by: true,
                    },
                });
                await prisma_1.prisma.auditLog.create({
                    data: {
                        entity_type: 'company_attribution',
                        entity_id: companyId,
                        action: 'LOCK',
                        performed_by: req.hrm8User.id,
                        performed_by_email: req.hrm8User.email,
                        performed_by_role: req.hrm8User.role,
                        description: 'Attribution locked',
                        changes: {
                            audit_type: 'ATTRIBUTION',
                            action: 'LOCKED',
                            previous_sales_agent_id: company.sales_agent_id,
                            new_sales_agent_id: company.sales_agent_id,
                            reason: 'LOCKED_BY_ADMIN',
                        },
                    },
                });
                return this.sendSuccess(res, { attribution: this.mapCompanyAttribution(updated) });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.overrideAttribution = async (req, res) => {
            try {
                this.ensureHrm8Admin(req);
                const companyId = String(req.params.companyId || '').trim();
                if (!companyId)
                    return this.sendError(res, new Error('companyId is required'), 400);
                const newConsultantId = (req.body?.new_consultant_id || req.body?.sales_agent_id || '').trim();
                const reason = (req.body?.reason || '').trim();
                if (!newConsultantId)
                    return this.sendError(res, new Error('new_consultant_id is required'), 400);
                if (!reason)
                    return this.sendError(res, new Error('reason is required'), 400);
                const company = await prisma_1.prisma.company.findUnique({
                    where: { id: companyId },
                    select: {
                        id: true,
                        name: true,
                        sales_agent_id: true,
                        referred_by: true,
                        attribution_locked: true,
                        attribution_locked_at: true,
                        created_by: true,
                    },
                });
                if (!company)
                    return this.sendError(res, new Error('Company not found'), 404);
                const consultant = await prisma_1.prisma.consultant.findUnique({
                    where: { id: newConsultantId },
                    select: { id: true },
                });
                if (!consultant)
                    return this.sendError(res, new Error('Consultant not found'), 404);
                const updated = await prisma_1.prisma.company.update({
                    where: { id: companyId },
                    data: {
                        sales_agent_id: newConsultantId,
                        attribution_locked: true,
                        attribution_locked_at: new Date(),
                    },
                    select: {
                        id: true,
                        name: true,
                        sales_agent_id: true,
                        referred_by: true,
                        attribution_locked: true,
                        attribution_locked_at: true,
                        created_by: true,
                    },
                });
                await prisma_1.prisma.auditLog.create({
                    data: {
                        entity_type: 'company_attribution',
                        entity_id: companyId,
                        action: 'OVERRIDE',
                        performed_by: req.hrm8User.id,
                        performed_by_email: req.hrm8User.email,
                        performed_by_role: req.hrm8User.role,
                        description: 'Attribution overridden',
                        changes: {
                            audit_type: 'ATTRIBUTION',
                            action: 'OVERRIDDEN',
                            previous_sales_agent_id: company.sales_agent_id,
                            new_sales_agent_id: newConsultantId,
                            reason,
                        },
                    },
                });
                return this.sendSuccess(res, { attribution: this.mapCompanyAttribution(updated) });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
    ensureHrm8Admin(req) {
        if (!req.hrm8User) {
            throw new Error('Not authenticated');
        }
        if (!['GLOBAL_ADMIN', 'REGIONAL_LICENSEE'].includes(req.hrm8User.role)) {
            throw new Error('Unauthorized: Admin only');
        }
    }
    mapCompanyAttribution(company) {
        return {
            company_id: company.id,
            company_name: company.name,
            sales_agent_id: company.sales_agent_id,
            referred_by: company.referred_by,
            attribution_locked: company.attribution_locked,
            attribution_locked_at: company.attribution_locked_at ? company.attribution_locked_at.toISOString() : null,
            created_by: company.created_by,
        };
    }
}
exports.AttributionController = AttributionController;
