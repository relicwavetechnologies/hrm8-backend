"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantAccessControl = void 0;
const assistant_types_1 = require("./assistant.types");
const logger_1 = require("../../utils/logger");
const prisma_1 = require("../../utils/prisma");
const assistant_role_mapper_1 = require("./assistant.role-mapper");
class AssistantAccessControl {
    /**
     * Determine user's access level based on actor type and role
     * Uses centralized role mapper to ensure consistency
     */
    static getAccessLevel(actor) {
        // console.log('[AccessControl] getAccessLevel called for actor:', {
        //   actorType: actor.actorType,
        //   userId: actor.userId,
        //   email: actor.email,
        // });
        // Validate actor first
        const validation = (0, assistant_role_mapper_1.validateActor)(actor);
        // console.log('[AccessControl] Actor validation result:', validation);
        if (!validation.valid) {
            this.logger.error('[AccessControl] Invalid actor', { error: validation.error });
            this.logger.error('Invalid actor', { error: validation.error, actor });
            throw new Error(`Invalid actor: ${validation.error}`);
        }
        const accessLevel = (0, assistant_role_mapper_1.getAccessLevelFromActor)(actor);
        // console.log('[AccessControl] Access level determined:', {
        //   accessLevel,
        //   description: getAccessLevelDescription(accessLevel),
        // });
        // this.logger.debug('Actor access level determined', {
        //   actorType: actor.actorType,
        //   userId: actor.userId,
        //   accessLevel,
        //   description: getAccessLevelDescription(accessLevel),
        // });
        return accessLevel;
    }
    /**
     * Check if actor can use a specific tool
     */
    static canUseTool(actor, tool) {
        const userLevel = this.getAccessLevel(actor);
        return tool.allowedRoles.includes(userLevel);
    }
    /**
     * Get allowed tools for actor
     */
    static getAllowedTools(tools, actor) {
        // console.log('[AccessControl] Getting allowed tools for actor:', {
        //   actorType: actor.actorType,
        //   userId: actor.userId,
        // });
        const userLevel = this.getAccessLevel(actor);
        // console.log('[AccessControl] User access level:', userLevel);
        const allowedTools = tools.filter((tool) => tool.allowedRoles.includes(userLevel));
        // console.log('[AccessControl] Filtered tools:', {
        //   totalTools: tools.length,
        //   allowedCount: allowedTools.length,
        //   allowedToolNames: allowedTools.map(t => t.name),
        // });
        return allowedTools;
    }
    /**
     * Check if actor is global HRM8 admin
     */
    static isGlobalAdmin(actor) {
        return actor.actorType === 'HRM8_USER' && actor.role === 'GLOBAL_ADMIN';
    }
    /**
     * Check if actor is regional admin
     */
    static isRegionalAdmin(actor) {
        return actor.actorType === 'HRM8_USER' && actor.role === 'REGIONAL_ADMIN';
    }
    /**
     * Check if actor is consultant
     */
    static isConsultant(actor) {
        return actor.actorType === 'CONSULTANT' || (actor.actorType === 'HRM8_USER' && actor.role === 'CONSULTANT');
    }
    /**
     * Get region scope for actor (null means no region restriction)
     */
    static getRegionScope(actor) {
        if (actor.actorType === 'COMPANY_USER') {
            return null; // Company users don't have region scope
        }
        if (actor.actorType === 'CONSULTANT') {
            return [actor.regionId];
        }
        if (actor.actorType === 'HRM8_USER') {
            if (this.isGlobalAdmin(actor)) {
                return null; // Global admin sees all regions
            }
            return actor.assignedRegionIds || [];
        }
        return null;
    }
    /**
     * Ensure actor has at least one region assigned (throws if not)
     */
    static ensureNonEmptyRegionScope(actor) {
        const scope = this.getRegionScope(actor);
        if (scope === null) {
            return []; // No restriction
        }
        if (scope.length === 0) {
            throw new Error('Your account does not have any assigned regions for this query.');
        }
        return scope;
    }
    /**
     * Apply regional scope filter to Prisma query
     */
    static applyRegionScope(actor, baseWhere = {}) {
        const regionScope = this.getRegionScope(actor);
        if (regionScope === null) {
            return baseWhere; // No region filter needed
        }
        if (regionScope.length === 0) {
            throw new Error('No assigned regions for this user.');
        }
        return {
            ...baseWhere,
            region_id: { in: regionScope },
        };
    }
    /**
     * Apply company scope filter to Prisma query
     */
    static applyCompanyScope(actor, baseWhere = {}) {
        if (actor.actorType === 'COMPANY_USER') {
            return {
                ...baseWhere,
                company_id: actor.companyId,
            };
        }
        return baseWhere;
    }
    /**
     * Apply job scope for consultants (only assigned jobs)
     */
    static applyJobScope(actor, baseWhere = {}) {
        if (this.isConsultant(actor)) {
            return {
                ...baseWhere,
                assigned_consultant_id: actor.userId,
            };
        }
        return baseWhere;
    }
    /**
     * For consultant-specific data: ensure consultant can only see their own data
     */
    static async enforceConsultantSelfScope(actor, consultantQuery) {
        if (actor.actorType === 'COMPANY_USER') {
            throw new Error('This tool is only available for HRM8 users and consultants.');
        }
        const userLevel = this.getAccessLevel(actor);
        if (userLevel === assistant_types_1.ToolAccessLevel.CONSULTANT) {
            // Consultants can only query themselves
            if (consultantQuery && consultantQuery !== actor.userId) {
                throw new Error('You can only view your own data.');
            }
            return actor.userId;
        }
        // Admins can query any consultant (within their region scope)
        if (!consultantQuery) {
            throw new Error('Please specify a consultant to query.');
        }
        const regionScope = this.getRegionScope(actor);
        const consultant = await prisma_1.prisma.consultant.findFirst({
            where: {
                OR: [
                    { id: consultantQuery },
                    { email: { equals: consultantQuery, mode: 'insensitive' } },
                ],
                ...(regionScope && regionScope.length > 0 ? { region_id: { in: regionScope } } : {}),
            },
            select: { id: true },
        });
        if (!consultant) {
            throw new Error('Consultant not found in your region scope.');
        }
        return consultant.id;
    }
    /**
     * Data sensitivity filter: redact sensitive fields based on role
     */
    static redactSensitiveData(actor, data, sensitivity) {
        const userLevel = this.getAccessLevel(actor);
        // Company users: redact critical financial data
        if (userLevel === assistant_types_1.ToolAccessLevel.COMPANY_USER) {
            if (sensitivity === 'CRITICAL' || sensitivity === 'HIGH') {
                return this.stripFinancialFields(data);
            }
        }
        // Consultants: redact other consultants' commission details
        if (userLevel === assistant_types_1.ToolAccessLevel.CONSULTANT && sensitivity === 'CRITICAL') {
            return this.stripOtherConsultantFinancials(data, actor.userId);
        }
        return data;
    }
    /**
     * Strip financial fields from data
     */
    static stripFinancialFields(data) {
        if (Array.isArray(data)) {
            return data.map((item) => this.stripFinancialFields(item));
        }
        if (typeof data === 'object' && data !== null) {
            const { commissionAmount, salary, offerAmount, revenue, amount, value, ...rest } = data;
            const redacted = {};
            for (const key of Object.keys(rest)) {
                redacted[key] = this.stripFinancialFields(rest[key]);
            }
            return redacted;
        }
        return data;
    }
    /**
     * Strip financial data for other consultants
     */
    static stripOtherConsultantFinancials(data, ownConsultantId) {
        if (Array.isArray(data)) {
            return data.map((item) => this.stripOtherConsultantFinancials(item, ownConsultantId));
        }
        if (typeof data === 'object' && data !== null) {
            if (data.consultantId && data.consultantId !== ownConsultantId) {
                const { commissionAmount, amount, ...rest } = data;
                return rest;
            }
            const result = {};
            for (const key of Object.keys(data)) {
                result[key] = this.stripOtherConsultantFinancials(data[key], ownConsultantId);
            }
            return result;
        }
        return data;
    }
    /**
     * Create audit log entry for tool execution
     */
    static async createAuditLog(actor, toolName, args, success, sensitivity) {
        try {
            await prisma_1.prisma.auditLog.create({
                data: {
                    entity_type: 'AI_TOOL_EXECUTION',
                    entity_id: toolName,
                    action: 'EXECUTE',
                    performed_by: actor.userId,
                    performed_by_email: actor.email,
                    performed_by_role: actor.actorType,
                    description: `AI tool execution: ${toolName}`,
                    changes: {
                        toolName,
                        sensitivity,
                        success,
                        args: sensitivity === 'CRITICAL' ? '[REDACTED]' : JSON.parse(JSON.stringify(args)),
                        timestamp: new Date().toISOString(),
                    },
                },
            });
        }
        catch (error) {
            this.logger.warn('Failed to create audit log', { error, toolName, userId: actor.userId });
        }
    }
    /**
     * Build scope description for system prompt
     */
    static buildScopeDescription(actor) {
        if (actor.actorType === 'COMPANY_USER') {
            return `Company-scoped user. companyId=${actor.companyId}, role=${actor.role}.`;
        }
        if (actor.actorType === 'CONSULTANT') {
            return `Consultant. regionId=${actor.regionId}, consultantId=${actor.consultantId}.`;
        }
        if (actor.actorType === 'HRM8_USER') {
            return `HRM8 user. role=${actor.role}, licenseeId=${actor.licenseeId || 'N/A'}, assignedRegionIds=${actor.assignedRegionIds?.join(',') || '[]'}.`;
        }
        return 'Unknown scope';
    }
}
exports.AssistantAccessControl = AssistantAccessControl;
AssistantAccessControl.logger = logger_1.Logger.create('assistant-access-control');
