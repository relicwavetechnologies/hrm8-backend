"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_REGISTRY = void 0;
exports.getToolByName = getToolByName;
exports.getAllToolNames = getAllToolNames;
const assistant_types_1 = require("./assistant.types");
const assistant_tool_implementations_1 = require("./assistant.tool-implementations");
// Import existing tools
const assistant_tools_1 = require("./assistant.tools");
/**
 * Comprehensive tool registry with role-based access control
 */
exports.TOOL_REGISTRY = [
    // ============================================================================
    // HIGH-VALUE COMPOSITE TOOLS
    // ============================================================================
    {
        name: 'get_candidate_complete_overview',
        description: 'Get comprehensive candidate overview including profile, applications, assessments, interviews, offers, and recent activity in one call. Use this instead of making multiple separate calls for candidate data.',
        parameters: assistant_tool_implementations_1.getCandidateCompleteOverviewSchema,
        allowedRoles: [
            assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN,
            assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN,
            assistant_types_1.ToolAccessLevel.CONSULTANT,
            assistant_types_1.ToolAccessLevel.COMPANY_ADMIN,
            assistant_types_1.ToolAccessLevel.COMPANY_USER,
        ],
        requiresRegionScope: true,
        requiresCompanyScope: true,
        dataSensitivity: 'HIGH',
        run: assistant_tool_implementations_1.getCandidateCompleteOverview,
    },
    {
        name: 'get_job_complete_dashboard',
        description: 'Get comprehensive job dashboard with pipeline metrics, top candidates, upcoming interviews, pending offers, and analytics. Use this for complete job overview instead of multiple calls.',
        parameters: assistant_tool_implementations_1.getJobCompleteDashboardSchema,
        allowedRoles: [
            assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN,
            assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN,
            assistant_types_1.ToolAccessLevel.CONSULTANT,
            assistant_types_1.ToolAccessLevel.COMPANY_ADMIN,
            assistant_types_1.ToolAccessLevel.COMPANY_USER,
        ],
        requiresRegionScope: true,
        requiresCompanyScope: true,
        dataSensitivity: 'MEDIUM',
        run: assistant_tool_implementations_1.getJobCompleteDashboard,
    },
    // ============================================================================
    // CONSULTANT-SPECIFIC TOOLS
    // ============================================================================
    {
        name: 'get_consultant_performance',
        description: 'Get consultant performance metrics including job assignments, placements, commissions, and activity summary. Consultants can only view their own data.',
        parameters: assistant_tool_implementations_1.getConsultantPerformanceSchema,
        allowedRoles: [assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN, assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN, assistant_types_1.ToolAccessLevel.CONSULTANT],
        requiresRegionScope: true,
        dataSensitivity: 'CRITICAL',
        run: assistant_tool_implementations_1.getConsultantPerformance,
    },
    {
        name: 'get_consultant_commission',
        description: 'Get consultant commission details including earned, pending, approved, paid, and withdrawn amounts with historical data. Consultants can only view their own commissions.',
        parameters: assistant_tool_implementations_1.getConsultantCommissionSchema,
        allowedRoles: [assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN, assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN, assistant_types_1.ToolAccessLevel.CONSULTANT],
        requiresRegionScope: true,
        dataSensitivity: 'CRITICAL',
        run: assistant_tool_implementations_1.getConsultantCommission,
    },
    {
        name: 'get_my_daily_briefing',
        description: 'Get personalized daily briefing for consultants with assigned jobs, upcoming interviews, pending applications, and recent commission summary. Only for consultants.',
        parameters: assistant_tool_implementations_1.getMyDailyBriefingSchema,
        allowedRoles: [assistant_types_1.ToolAccessLevel.CONSULTANT],
        requiresRegionScope: true,
        dataSensitivity: 'MEDIUM',
        run: assistant_tool_implementations_1.getMyDailyBriefing,
    },
    // ============================================================================
    // ANALYTICS & REPORTING TOOLS
    // ============================================================================
    {
        name: 'get_hiring_funnel_analytics',
        description: 'Get hiring funnel analytics with stage-by-stage breakdown, conversion rates, time-to-hire metrics, and quality indicators. Can be scoped to company, region, or specific job.',
        parameters: assistant_tool_implementations_1.getHiringFunnelAnalyticsSchema,
        allowedRoles: [
            assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN,
            assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN,
            assistant_types_1.ToolAccessLevel.CONSULTANT,
            assistant_types_1.ToolAccessLevel.COMPANY_ADMIN,
        ],
        requiresRegionScope: true,
        requiresCompanyScope: true,
        dataSensitivity: 'LOW',
        run: assistant_tool_implementations_1.getHiringFunnelAnalytics,
    },
    {
        name: 'get_regional_performance',
        description: 'Get regional performance metrics including revenue, placements, active jobs, and consultant activity. Only for HRM8 users with regional or global admin access. If no regionId is provided, returns data for all assigned regions.',
        parameters: assistant_tool_implementations_1.getRegionalPerformanceSchema,
        allowedRoles: [assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN, assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN],
        requiresRegionScope: true,
        dataSensitivity: 'HIGH',
        run: assistant_tool_implementations_1.getRegionalPerformance,
    },
    // ============================================================================
    // INTERVIEW & ASSESSMENT TOOLS
    // ============================================================================
    {
        name: 'get_interview_details',
        description: 'Get interview schedules, feedback, and status for applications. Can search by application ID, job, or candidate.',
        parameters: assistant_tool_implementations_1.getInterviewDetailsSchema,
        allowedRoles: [
            assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN,
            assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN,
            assistant_types_1.ToolAccessLevel.CONSULTANT,
            assistant_types_1.ToolAccessLevel.COMPANY_ADMIN,
            assistant_types_1.ToolAccessLevel.COMPANY_USER,
        ],
        requiresRegionScope: true,
        requiresCompanyScope: true,
        dataSensitivity: 'MEDIUM',
        run: assistant_tool_implementations_1.getInterviewDetails,
    },
    // TEMPORARILY DISABLED: Schema mismatch - AssessmentResponse doesn't match expected structure
    // {
    //   name: 'get_assessment_results',
    //   description: 'Get assessment results including scores, responses, and completion status for a specific application.',
    //   parameters: getAssessmentResultsSchema,
    //   allowedRoles: [ToolAccessLevel.GLOBAL_ADMIN, ToolAccessLevel.REGIONAL_ADMIN, ToolAccessLevel.CONSULTANT, ToolAccessLevel.COMPANY_ADMIN],
    //   requiresRegionScope: true,
    //   requiresCompanyScope: true,
    //   dataSensitivity: 'HIGH',
    //   run: getAssessmentResults,
    // },
    // ============================================================================
    // OFFER MANAGEMENT TOOLS
    // ============================================================================
    {
        name: 'get_offer_status',
        description: 'Get offer letter status, negotiations, and acceptance details. Can search by application ID, candidate, or job.',
        parameters: assistant_tool_implementations_1.getOfferStatusSchema,
        allowedRoles: [
            assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN,
            assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN,
            assistant_types_1.ToolAccessLevel.CONSULTANT,
            assistant_types_1.ToolAccessLevel.COMPANY_ADMIN,
        ],
        requiresRegionScope: true,
        requiresCompanyScope: true,
        dataSensitivity: 'CRITICAL',
        run: assistant_tool_implementations_1.getOfferStatus,
    },
    // ============================================================================
    // CRM & BUSINESS TOOLS
    // ============================================================================
    {
        name: 'get_lead_pipeline',
        description: 'Get lead pipeline with opportunities, stages, and conversion metrics. Only available for HRM8 users and consultants.',
        parameters: assistant_tool_implementations_1.getLeadPipelineSchema,
        allowedRoles: [assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN, assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN, assistant_types_1.ToolAccessLevel.CONSULTANT],
        requiresRegionScope: true,
        dataSensitivity: 'MEDIUM',
        run: assistant_tool_implementations_1.getLeadPipeline,
    },
    {
        name: 'get_company_financial_summary',
        description: 'Get company financial summary including subscriptions, bills, and revenue. Contains sensitive financial data.',
        parameters: assistant_tool_implementations_1.getCompanyFinancialSummarySchema,
        allowedRoles: [assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN, assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN, assistant_types_1.ToolAccessLevel.COMPANY_ADMIN],
        requiresRegionScope: true,
        requiresCompanyScope: true,
        dataSensitivity: 'CRITICAL',
        run: assistant_tool_implementations_1.getCompanyFinancialSummary,
    },
    // ============================================================================
    // COMMUNICATION & ACTIVITY TOOLS
    // ============================================================================
    // TEMPORARILY DISABLED: Log models not accessible in Prisma client
    // {
    //   name: 'get_communication_history',
    //   description: 'Get email, call, SMS, and notification history for candidates, companies, jobs, or applications.',
    //   parameters: getCommunicationHistorySchema,
    //   allowedRoles: [ToolAccessLevel.GLOBAL_ADMIN, ToolAccessLevel.REGIONAL_ADMIN, ToolAccessLevel.CONSULTANT, ToolAccessLevel.COMPANY_ADMIN],
    //   requiresRegionScope: true,
    //   requiresCompanyScope: true,
    //   dataSensitivity: 'HIGH',
    //   run: getCommunicationHistory,
    // },
    {
        name: 'get_activity_feed',
        description: 'Get activity feed for jobs, candidates, companies, or consultants with filterable activity types.',
        parameters: assistant_tool_implementations_1.getActivityFeedSchema,
        allowedRoles: [
            assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN,
            assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN,
            assistant_types_1.ToolAccessLevel.CONSULTANT,
            assistant_types_1.ToolAccessLevel.COMPANY_ADMIN,
            assistant_types_1.ToolAccessLevel.COMPANY_USER,
        ],
        requiresRegionScope: true,
        requiresCompanyScope: true,
        dataSensitivity: 'LOW',
        run: assistant_tool_implementations_1.getActivityFeed,
    },
    // ============================================================================
    // CONSULTANT PERSONALIZATION TOOLS
    // ============================================================================
    {
        name: 'get_my_companies',
        description: 'Get list of companies the consultant is currently working with, including active jobs count and pipeline stats.',
        parameters: assistant_tool_implementations_1.getMyCompaniesSchema,
        allowedRoles: [assistant_types_1.ToolAccessLevel.CONSULTANT],
        requiresRegionScope: true,
        dataSensitivity: 'MEDIUM',
        run: assistant_tool_implementations_1.getMyCompanies,
    },
    {
        name: 'get_my_candidates',
        description: 'Get list of candidates in the consultant\'s pipeline, with filtering by application status.',
        parameters: assistant_tool_implementations_1.getMyCandidatesSchema,
        allowedRoles: [assistant_types_1.ToolAccessLevel.CONSULTANT],
        requiresRegionScope: true,
        dataSensitivity: 'HIGH',
        run: assistant_tool_implementations_1.getMyCandidates,
    },
    {
        name: 'get_my_quick_stats',
        description: 'Get dashboard summary for the consultant including active jobs, pipeline count, upcoming interviews, and pending commissions.',
        parameters: assistant_tool_implementations_1.getMyQuickStatsSchema,
        allowedRoles: [assistant_types_1.ToolAccessLevel.CONSULTANT],
        requiresRegionScope: true,
        dataSensitivity: 'MEDIUM',
        run: assistant_tool_implementations_1.getMyQuickStats,
    },
    // ============================================================================
    // ADMIN SEARCH TOOLS
    // ==============================================================================
    {
        name: 'search_consultants',
        description: 'Search consultants by name, email, or region. Returns consultant details including ID, contact info, and status.',
        parameters: assistant_tool_implementations_1.searchConsultantsSchema,
        allowedRoles: [assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN, assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN],
        requiresRegionScope: false,
        dataSensitivity: 'MEDIUM',
        run: assistant_tool_implementations_1.searchConsultants,
    },
    {
        name: 'search_candidates_by_name',
        description: 'Search candidates by name or email across all accessible applications. Returns candidate details and recent applications.',
        parameters: assistant_tool_implementations_1.searchCandidatesByNameSchema,
        allowedRoles: [
            assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN,
            assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN,
            assistant_types_1.ToolAccessLevel.CONSULTANT,
            assistant_types_1.ToolAccessLevel.COMPANY_ADMIN,
            assistant_types_1.ToolAccessLevel.COMPANY_USER,
        ],
        requiresRegionScope: true,
        requiresCompanyScope: true,
        dataSensitivity: 'HIGH',
        run: assistant_tool_implementations_1.searchCandidatesByName,
    },
    // ============================================================================
    // ADMIN MONITORING TOOLS
    // ============================================================================
    {
        name: 'get_recent_audit_logs',
        description: 'Get recent audit logs for system activity monitoring. Shows entity changes, actions, and who performed them. Default limit of 5 entries.',
        parameters: assistant_tool_implementations_1.getRecentAuditLogsSchema,
        allowedRoles: [assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN, assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN],
        requiresRegionScope: false,
        dataSensitivity: 'HIGH',
        run: assistant_tool_implementations_1.getRecentAuditLogs,
    },
    {
        name: 'get_revenue_analytics',
        description: 'Get revenue analytics including commission totals, cash movement, revenue splits, and company-level breakdowns. Helps track financial performance.',
        parameters: assistant_tool_implementations_1.getRevenueAnalyticsSchema,
        allowedRoles: [assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN, assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN],
        requiresRegionScope: false,
        dataSensitivity: 'HIGH',
        run: assistant_tool_implementations_1.getRevenueAnalytics,
    },
    {
        name: 'get_licensee_leaderboard',
        description: 'Get leaderboard of top performing regional licensees/regions based on revenue or HRM8 share. Restricted to Global Admins.',
        parameters: assistant_tool_implementations_1.getLicenseeLeaderboardSchema,
        allowedRoles: [assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN],
        requiresRegionScope: false,
        dataSensitivity: 'HIGH',
        run: assistant_tool_implementations_1.getLicenseeLeaderboard,
    },
    // ============================================================================
    // LEGACY TOOLS (from assistant.tools.ts)
    // ============================================================================
    ...assistant_tools_1.assistantTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters, // Now using proper Zod schemas
        allowedRoles: [
            assistant_types_1.ToolAccessLevel.GLOBAL_ADMIN,
            assistant_types_1.ToolAccessLevel.REGIONAL_ADMIN,
            assistant_types_1.ToolAccessLevel.CONSULTANT,
            assistant_types_1.ToolAccessLevel.COMPANY_ADMIN,
            assistant_types_1.ToolAccessLevel.COMPANY_USER,
        ],
        requiresRegionScope: true,
        requiresCompanyScope: true,
        dataSensitivity: 'MEDIUM',
        run: tool.run,
    })),
];
/**
 * Get tool by name
 */
function getToolByName(name) {
    return exports.TOOL_REGISTRY.find((tool) => tool.name === name);
}
/**
 * Get all tool names
 */
function getAllToolNames() {
    return exports.TOOL_REGISTRY.map((tool) => tool.name);
}
