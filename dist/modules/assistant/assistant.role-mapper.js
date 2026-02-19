"use strict";
/**
 * Role Mapping and Validation for AI Assistant Access Control
 *
 * This module ensures that roles from different user types (HRM8, Company, Consultant)
 * are correctly mapped to ToolAccessLevel without enum mismatches.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRISMA_ROLES = exports.ROLE_MAPPING = void 0;
exports.getAccessLevelFromActor = getAccessLevelFromActor;
exports.validateActor = validateActor;
exports.getAccessLevelDescription = getAccessLevelDescription;
exports.hasSameAccessLevel = hasSameAccessLevel;
exports.hasHigherPrivileges = hasHigherPrivileges;
exports.getRoleDisplayName = getRoleDisplayName;
const client_1 = require("@prisma/client");
const assistant_types_1 = require("./assistant.types");
/**
 * Role mapping configuration
 * Maps Prisma enum values to ToolAccessLevel
 */
exports.ROLE_MAPPING = {
    // HRM8 User Roles
    HRM8_USER: {
        [client_1.HRM8UserRole.GLOBAL_ADMIN]: assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN,
        [client_1.HRM8UserRole.REGIONAL_LICENSEE]: assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN,
    },
    // Company User Roles
    COMPANY_USER: {
        [client_1.UserRole.SUPER_ADMIN]: assistant_types_1.ToolAccessLevel.COMPANY_ADMIN,
        [client_1.UserRole.ADMIN]: assistant_types_1.ToolAccessLevel.COMPANY_ADMIN,
        [client_1.UserRole.USER]: assistant_types_1.ToolAccessLevel.COMPANY_USER,
        [client_1.UserRole.VISITOR]: assistant_types_1.ToolAccessLevel.COMPANY_USER, // Limited access
    },
    // Consultant Roles (all map to CONSULTANT access level)
    CONSULTANT: {
        [client_1.ConsultantRole.RECRUITER]: assistant_types_1.ToolAccessLevel.CONSULTANT,
        [client_1.ConsultantRole.SALES_AGENT]: assistant_types_1.ToolAccessLevel.CONSULTANT,
        [client_1.ConsultantRole.CONSULTANT_360]: assistant_types_1.ToolAccessLevel.CONSULTANT,
    },
};
/**
 * Get ToolAccessLevel from AssistantActor
 * This is the single source of truth for role mapping
 */
function getAccessLevelFromActor(actor) {
    if (actor.actorType === 'HRM8_USER') {
        // actor.role is a string from the session, need to match it
        const role = actor.role;
        if (role === client_1.HRM8UserRole.GLOBAL_ADMIN || role === 'GLOBAL_ADMIN') {
            return assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN;
        }
        if (role === client_1.HRM8UserRole.REGIONAL_LICENSEE || role === 'REGIONAL_LICENSEE' || role === 'REGIONAL_ADMIN') {
            return assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN;
        }
        // Fallback: treat unknown HRM8 roles as regional admin for safety
        // console.warn(`[Role Mapper] Unknown HRM8 role: ${role}, defaulting to REGIONAL_ADMIN`);
        return assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN;
    }
    if (actor.actorType === 'CONSULTANT') {
        // All consultants get CONSULTANT access level regardless of their specific role
        return assistant_types_1.ToolAccessLevel.CONSULTANT;
    }
    if (actor.actorType === 'COMPANY_USER') {
        const role = actor.role;
        const roleStr = typeof role === 'string' ? role : String(role);
        if (roleStr === client_1.UserRole.SUPER_ADMIN || roleStr === client_1.UserRole.ADMIN ||
            roleStr === 'SUPER_ADMIN' || roleStr === 'ADMIN') {
            return assistant_types_1.ToolAccessLevel.COMPANY_ADMIN;
        }
        if (roleStr === client_1.UserRole.USER || roleStr === client_1.UserRole.VISITOR ||
            roleStr === 'USER' || roleStr === 'VISITOR') {
            return assistant_types_1.ToolAccessLevel.COMPANY_USER;
        }
        // Fallback: treat unknown company roles as regular user for safety
        // console.warn(`[Role Mapper] Unknown company role: ${roleStr}, defaulting to COMPANY_USER`);
        return assistant_types_1.ToolAccessLevel.COMPANY_USER;
    }
    // Should never happen, but TypeScript exhaustiveness check
    throw new Error(`Unknown actor type: ${actor.actorType}`);
}
/**
 * Validate that actor has required fields based on type
 */
function validateActor(actor) {
    // console.log('[RoleMapper] validateActor called with:', {
    //   actorType: actor?.actorType,
    //   userId: actor?.userId,
    //   email: actor?.email,
    //   consultantId: actor?.actorType === 'CONSULTANT' ? (actor as any).consultantId : undefined,
    //   regionId: actor?.actorType === 'CONSULTANT' ? (actor as any).regionId : undefined,
    // });
    if (!actor || !actor.actorType) {
        // console.error('[RoleMapper] Actor is missing or invalid');
        return { valid: false, error: 'Actor is missing or invalid' };
    }
    if (!actor.userId || !actor.email) {
        // console.error('[RoleMapper] Actor missing userId or email');
        return { valid: false, error: 'Actor is missing userId or email' };
    }
    if (actor.actorType === 'COMPANY_USER') {
        if (!actor.companyId) {
            // console.error('[RoleMapper] Company user missing companyId');
            return { valid: false, error: 'Company user is missing companyId' };
        }
        if (!actor.role) {
            // console.error('[RoleMapper] Company user missing role');
            return { valid: false, error: 'Company user is missing role' };
        }
    }
    if (actor.actorType === 'HRM8_USER') {
        if (!actor.role) {
            // console.error('[RoleMapper] HRM8 user missing role');
            return { valid: false, error: 'HRM8 user is missing role' };
        }
        // Regional licensees must have assigned regions
        const accessLevel = getAccessLevelFromActor(actor);
        if (accessLevel === assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN) {
            if (!actor.assignedRegionIds || actor.assignedRegionIds.length === 0) {
                // console.error('[RoleMapper] Regional admin has no assigned regions');
                return { valid: false, error: 'Regional admin has no assigned regions' };
            }
        }
    }
    if (actor.actorType === 'CONSULTANT') {
        // console.log('[RoleMapper] Validating CONSULTANT actor');
        if (!actor.consultantId || !actor.regionId) {
            // console.error('[RoleMapper] Consultant missing consultantId or regionId:', {
            //   consultantId: actor.consultantId,
            //   regionId: actor.regionId,
            // });
            return { valid: false, error: 'Consultant is missing consultantId or regionId' };
        }
        // console.log('[RoleMapper] Consultant validation passed');
    }
    // console.log('[RoleMapper] Actor validation successful');
    return { valid: true };
}
/**
 * Get a human-readable description of the access level
 */
function getAccessLevelDescription(level) {
    switch (level) {
        case assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN:
            return 'Global Administrator (Full Access)';
        case assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN:
            return 'Regional Administrator (Region-Scoped Access)';
        case assistant_types_1.ToolAccessLevel.CONSULTANT:
            return 'Consultant (Job-Scoped Access)';
        case assistant_types_1.ToolAccessLevel.COMPANY_ADMIN:
            return 'Company Administrator (Company-Scoped Access)';
        case assistant_types_1.ToolAccessLevel.COMPANY_USER:
            return 'Company User (Limited Access)';
        default:
            return 'Unknown Access Level';
    }
}
/**
 * Check if two actors have the same access level
 */
function hasSameAccessLevel(actor1, actor2) {
    return getAccessLevelFromActor(actor1) === getAccessLevelFromActor(actor2);
}
/**
 * Check if actor1 has higher privileges than actor2
 */
function hasHigherPrivileges(actor1, actor2) {
    const level1 = getAccessLevelFromActor(actor1);
    const level2 = getAccessLevelFromActor(actor2);
    const privilegeOrder = [
        assistant_types_1.ToolAccessLevel.COMPANY_USER,
        assistant_types_1.ToolAccessLevel.COMPANY_ADMIN,
        assistant_types_1.ToolAccessLevel.CONSULTANT,
        assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN,
        assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN,
    ];
    const index1 = privilegeOrder.indexOf(level1);
    const index2 = privilegeOrder.indexOf(level2);
    return index1 > index2;
}
/**
 * Get role display name for logging/UI
 */
function getRoleDisplayName(actor) {
    if (actor.actorType === 'HRM8_USER') {
        return `HRM8 ${actor.role}`;
    }
    if (actor.actorType === 'CONSULTANT') {
        return 'Consultant';
    }
    if (actor.actorType === 'COMPANY_USER') {
        return `Company ${actor.role}`;
    }
    return 'Unknown';
}
/**
 * Export role enum constants for use in other modules
 */
exports.PRISMA_ROLES = {
    HRM8: client_1.HRM8UserRole,
    COMPANY: client_1.UserRole,
    CONSULTANT: client_1.ConsultantRole,
};
