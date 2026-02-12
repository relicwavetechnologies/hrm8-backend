import { ToolDefinition, ToolAccessLevel } from './assistant.types';
import {
  getCandidateCompleteOverview,
  getCandidateCompleteOverviewSchema,
  getJobCompleteDashboard,
  getJobCompleteDashboardSchema,
  getConsultantPerformance,
  getConsultantPerformanceSchema,
  getConsultantCommission,
  getConsultantCommissionSchema,
  getHiringFunnelAnalytics,
  getHiringFunnelAnalyticsSchema,
  getInterviewDetails,
  getInterviewDetailsSchema,
  getAssessmentResults,
  getAssessmentResultsSchema,
  getOfferStatus,
  getOfferStatusSchema,
  getLeadPipeline,
  getLeadPipelineSchema,
  getCompanyFinancialSummary,
  getCompanyFinancialSummarySchema,
  getCommunicationHistory,
  getCommunicationHistorySchema,
  getActivityFeed,
  getActivityFeedSchema,
  getMyDailyBriefing,
  getMyDailyBriefingSchema,
  getRegionalPerformance,
  getRegionalPerformanceSchema,
  getMyCompanies,
  getMyCompaniesSchema,
  getMyCandidates,
  getMyCandidatesSchema,
  getMyQuickStats,
  getMyQuickStatsSchema,
  searchConsultants,
  searchConsultantsSchema,
  searchCandidatesByName,
  searchCandidatesByNameSchema,
  // New admin monitoring tools
  getRecentAuditLogs,
  getRecentAuditLogsSchema,
  getRevenueAnalytics,
  getRevenueAnalyticsSchema,
  getLicenseeLeaderboard,
  getLicenseeLeaderboardSchema,
} from './assistant.tool-implementations';

// Import existing tools
import { assistantTools } from './assistant.tools';

/**
 * Comprehensive tool registry with role-based access control
 */
export const TOOL_REGISTRY: ToolDefinition[] = [
  // ============================================================================
  // HIGH-VALUE COMPOSITE TOOLS
  // ============================================================================

  {
    name: 'get_candidate_complete_overview',
    description:
      'Get comprehensive candidate overview including profile, applications, assessments, interviews, offers, and recent activity in one call. Use this instead of making multiple separate calls for candidate data.',
    parameters: getCandidateCompleteOverviewSchema,
    allowedRoles: [
      ToolAccessLevel.GLOBAL_ADMIN,
      ToolAccessLevel.REGIONAL_ADMIN,
      ToolAccessLevel.CONSULTANT,
      ToolAccessLevel.COMPANY_ADMIN,
      ToolAccessLevel.COMPANY_USER,
    ],
    requiresRegionScope: true,
    requiresCompanyScope: true,
    dataSensitivity: 'HIGH',
    run: getCandidateCompleteOverview,
  },

  {
    name: 'get_job_complete_dashboard',
    description:
      'Get comprehensive job dashboard with pipeline metrics, top candidates, upcoming interviews, pending offers, and analytics. Use this for complete job overview instead of multiple calls.',
    parameters: getJobCompleteDashboardSchema,
    allowedRoles: [
      ToolAccessLevel.GLOBAL_ADMIN,
      ToolAccessLevel.REGIONAL_ADMIN,
      ToolAccessLevel.CONSULTANT,
      ToolAccessLevel.COMPANY_ADMIN,
      ToolAccessLevel.COMPANY_USER,
    ],
    requiresRegionScope: true,
    requiresCompanyScope: true,
    dataSensitivity: 'MEDIUM',
    run: getJobCompleteDashboard,
  },

  // ============================================================================
  // CONSULTANT-SPECIFIC TOOLS
  // ============================================================================

  {
    name: 'get_consultant_performance',
    description:
      'Get consultant performance metrics including job assignments, placements, commissions, and activity summary. Consultants can only view their own data.',
    parameters: getConsultantPerformanceSchema,
    allowedRoles: [ToolAccessLevel.GLOBAL_ADMIN, ToolAccessLevel.REGIONAL_ADMIN, ToolAccessLevel.CONSULTANT],
    requiresRegionScope: true,
    dataSensitivity: 'CRITICAL',
    run: getConsultantPerformance,
  },

  {
    name: 'get_consultant_commission',
    description:
      'Get consultant commission details including earned, pending, approved, paid, and withdrawn amounts with historical data. Consultants can only view their own commissions.',
    parameters: getConsultantCommissionSchema,
    allowedRoles: [ToolAccessLevel.GLOBAL_ADMIN, ToolAccessLevel.REGIONAL_ADMIN, ToolAccessLevel.CONSULTANT],
    requiresRegionScope: true,
    dataSensitivity: 'CRITICAL',
    run: getConsultantCommission,
  },

  {
    name: 'get_my_daily_briefing',
    description:
      'Get personalized daily briefing for consultants with assigned jobs, upcoming interviews, pending applications, and recent commission summary. Only for consultants.',
    parameters: getMyDailyBriefingSchema,
    allowedRoles: [ToolAccessLevel.CONSULTANT],
    requiresRegionScope: true,
    dataSensitivity: 'MEDIUM',
    run: getMyDailyBriefing,
  },

  // ============================================================================
  // ANALYTICS & REPORTING TOOLS
  // ============================================================================

  {
    name: 'get_hiring_funnel_analytics',
    description:
      'Get hiring funnel analytics with stage-by-stage breakdown, conversion rates, time-to-hire metrics, and quality indicators. Can be scoped to company, region, or specific job.',
    parameters: getHiringFunnelAnalyticsSchema,
    allowedRoles: [
      ToolAccessLevel.GLOBAL_ADMIN,
      ToolAccessLevel.REGIONAL_ADMIN,
      ToolAccessLevel.CONSULTANT,
      ToolAccessLevel.COMPANY_ADMIN,
    ],
    requiresRegionScope: true,
    requiresCompanyScope: true,
    dataSensitivity: 'LOW',
    run: getHiringFunnelAnalytics,
  },

  {
    name: 'get_regional_performance',
    description:
      'Get regional performance metrics including revenue, placements, active jobs, and consultant activity. Only for HRM8 users with regional or global admin access.',
    parameters: getRegionalPerformanceSchema,
    allowedRoles: [ToolAccessLevel.GLOBAL_ADMIN, ToolAccessLevel.REGIONAL_ADMIN],
    requiresRegionScope: true,
    dataSensitivity: 'HIGH',
    run: getRegionalPerformance,
  },

  // ============================================================================
  // INTERVIEW & ASSESSMENT TOOLS
  // ============================================================================

  {
    name: 'get_interview_details',
    description:
      'Get interview schedules, feedback, and status for applications. Can search by application ID, job, or candidate.',
    parameters: getInterviewDetailsSchema,
    allowedRoles: [
      ToolAccessLevel.GLOBAL_ADMIN,
      ToolAccessLevel.REGIONAL_ADMIN,
      ToolAccessLevel.CONSULTANT,
      ToolAccessLevel.COMPANY_ADMIN,
      ToolAccessLevel.COMPANY_USER,
    ],
    requiresRegionScope: true,
    requiresCompanyScope: true,
    dataSensitivity: 'MEDIUM',
    run: getInterviewDetails,
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
    description:
      'Get offer letter status, negotiations, and acceptance details. Can search by application ID, candidate, or job.',
    parameters: getOfferStatusSchema,
    allowedRoles: [
      ToolAccessLevel.GLOBAL_ADMIN,
      ToolAccessLevel.REGIONAL_ADMIN,
      ToolAccessLevel.CONSULTANT,
      ToolAccessLevel.COMPANY_ADMIN,
    ],
    requiresRegionScope: true,
    requiresCompanyScope: true,
    dataSensitivity: 'CRITICAL',
    run: getOfferStatus,
  },

  // ============================================================================
  // CRM & BUSINESS TOOLS
  // ============================================================================

  {
    name: 'get_lead_pipeline',
    description:
      'Get lead pipeline with opportunities, stages, and conversion metrics. Only available for HRM8 users and consultants.',
    parameters: getLeadPipelineSchema,
    allowedRoles: [ToolAccessLevel.GLOBAL_ADMIN, ToolAccessLevel.REGIONAL_ADMIN, ToolAccessLevel.CONSULTANT],
    requiresRegionScope: true,
    dataSensitivity: 'MEDIUM',
    run: getLeadPipeline,
  },

  {
    name: 'get_company_financial_summary',
    description:
      'Get company financial summary including subscriptions, bills, and revenue. Contains sensitive financial data.',
    parameters: getCompanyFinancialSummarySchema,
    allowedRoles: [ToolAccessLevel.GLOBAL_ADMIN, ToolAccessLevel.REGIONAL_ADMIN, ToolAccessLevel.COMPANY_ADMIN],
    requiresRegionScope: true,
    requiresCompanyScope: true,
    dataSensitivity: 'CRITICAL',
    run: getCompanyFinancialSummary,
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
    parameters: getActivityFeedSchema,
    allowedRoles: [
      ToolAccessLevel.GLOBAL_ADMIN,
      ToolAccessLevel.REGIONAL_ADMIN,
      ToolAccessLevel.CONSULTANT,
      ToolAccessLevel.COMPANY_ADMIN,
      ToolAccessLevel.COMPANY_USER,
    ],
    requiresRegionScope: true,
    requiresCompanyScope: true,
    dataSensitivity: 'LOW',
    run: getActivityFeed,
  },

  // ============================================================================
  // CONSULTANT PERSONALIZATION TOOLS
  // ============================================================================

  {
    name: 'get_my_companies',
    description: 'Get list of companies the consultant is currently working with, including active jobs count and pipeline stats.',
    parameters: getMyCompaniesSchema,
    allowedRoles: [ToolAccessLevel.CONSULTANT],
    requiresRegionScope: true,
    dataSensitivity: 'MEDIUM',
    run: getMyCompanies,
  },

  {
    name: 'get_my_candidates',
    description: 'Get list of candidates in the consultant\'s pipeline, with filtering by application status.',
    parameters: getMyCandidatesSchema,
    allowedRoles: [ToolAccessLevel.CONSULTANT],
    requiresRegionScope: true,
    dataSensitivity: 'HIGH',
    run: getMyCandidates,
  },

  {
    name: 'get_my_quick_stats',
    description: 'Get dashboard summary for the consultant including active jobs, pipeline count, upcoming interviews, and pending commissions.',
    parameters: getMyQuickStatsSchema,
    allowedRoles: [ToolAccessLevel.CONSULTANT],
    requiresRegionScope: true,
    dataSensitivity: 'MEDIUM',
    run: getMyQuickStats,
  },

  // ============================================================================
  // ADMIN SEARCH TOOLS
  // ==============================================================================

  {
    name: 'search_consultants',
    description: 'Search consultants by name, email, or region. Returns consultant details including ID, contact info, and status.',
    parameters: searchConsultantsSchema,
    allowedRoles: [ToolAccessLevel.GLOBAL_ADMIN, ToolAccessLevel.REGIONAL_ADMIN],
    requiresRegionScope: false,
    dataSensitivity: 'MEDIUM',
    run: searchConsultants,
  },

  {
    name: 'search_candidates_by_name',
    description: 'Search candidates by name or email across all accessible applications. Returns candidate details and recent applications.',
    parameters: searchCandidatesByNameSchema,
    allowedRoles: [
      ToolAccessLevel.GLOBAL_ADMIN,
      ToolAccessLevel.REGIONAL_ADMIN,
      ToolAccessLevel.CONSULTANT,
      ToolAccessLevel.COMPANY_ADMIN,
      ToolAccessLevel.COMPANY_USER,
    ],
    requiresRegionScope: true,
    requiresCompanyScope: true,
    dataSensitivity: 'HIGH',
    run: searchCandidatesByName,
  },

  // ============================================================================
  // ADMIN MONITORING TOOLS
  // ============================================================================

  {
    name: 'get_recent_audit_logs',
    description: 'Get recent audit logs for system activity monitoring. Shows entity changes, actions, and who performed them. Default limit of 5 entries.',
    parameters: getRecentAuditLogsSchema,
    allowedRoles: [ToolAccessLevel.GLOBAL_ADMIN, ToolAccessLevel.REGIONAL_ADMIN],
    requiresRegionScope: false,
    dataSensitivity: 'HIGH',
    run: getRecentAuditLogs,
  },

  {
    name: 'get_revenue_analytics',
    description: 'Get revenue analytics including commission totals, cash movement, revenue splits, and company-level breakdowns. Helps track financial performance.',
    parameters: getRevenueAnalyticsSchema,
    allowedRoles: [ToolAccessLevel.GLOBAL_ADMIN, ToolAccessLevel.REGIONAL_ADMIN],
    requiresRegionScope: false,
    dataSensitivity: 'HIGH',
    run: getRevenueAnalytics,
  },

  {
    name: 'get_licensee_leaderboard',
    description: 'Get leaderboard of top performing regional licensees/regions based on revenue or HRM8 share. Restricted to Global Admins.',
    parameters: getLicenseeLeaderboardSchema,
    allowedRoles: [ToolAccessLevel.GLOBAL_ADMIN],
    requiresRegionScope: false,
    dataSensitivity: 'HIGH',
    run: getLicenseeLeaderboard,
  },

  // ============================================================================

  // LEGACY TOOLS (from assistant.tools.ts)
  // ============================================================================

  ...assistantTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters, // Now using proper Zod schemas
    allowedRoles: [
      ToolAccessLevel.GLOBAL_ADMIN,
      ToolAccessLevel.REGIONAL_ADMIN,
      ToolAccessLevel.CONSULTANT,
      ToolAccessLevel.COMPANY_ADMIN,
      ToolAccessLevel.COMPANY_USER,
    ],
    requiresRegionScope: true,
    requiresCompanyScope: true,
    dataSensitivity: 'MEDIUM' as const,
    run: tool.run,
  })),
];

/**
 * Get tool by name
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.name === name);
}

/**
 * Get all tool names
 */
export function getAllToolNames(): string[] {
  return TOOL_REGISTRY.map((tool) => tool.name);
}
