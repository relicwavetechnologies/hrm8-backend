import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { AssistantActor } from './assistant.types';
import { AssistantAccessControl } from './assistant.access-control';
import {
  ActorType,
  ApplicationStage,
  ApplicationStatus,
  TaskPriority,
  TaskStatus,
  VideoInterviewType,
} from '@prisma/client';
import { ApplicationActivityService } from '../application/application-activity.service';
import { InterviewService } from '../interview/interview.service';
import { CommunicationService } from '../communication/communication.service';
import { ApplicationTaskService } from '../task/application-task.service';
import { gmailService } from '../integration/gmail.service';

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

const textQuerySchema = z.string().trim().min(2).max(120);
const uuidSchema = z.string().uuid();
const timeRangeSchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .optional();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const SEARCH_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'jobs',
  'job',
  'recent',
  'posted',
  'status',
  'show',
  'about',
  'of',
  'at',
  'in',
  'on',
]);

function extractSearchTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !SEARCH_STOP_WORDS.has(token))
    .slice(0, 6);
}

function buildTokenAndFilter(tokens: string[], fields: string[]): any {
  if (!tokens.length) return null;

  return {
    AND: tokens.map((token) => ({
      OR: fields.map((field) => {
        const parts = field.split('.');
        if (parts.length === 1) {
          return { [field]: { contains: token, mode: 'insensitive' as const } };
        } else {
          // Nested field like "company.name"
          const [relation, nestedField] = parts;
          return {
            [relation]: {
              is: { [nestedField]: { contains: token, mode: 'insensitive' as const } },
            },
          };
        }
      }),
    })),
  };
}

const STAGE_TO_STATUS_MAP: Record<ApplicationStage, ApplicationStatus> = {
  NEW_APPLICATION: ApplicationStatus.NEW,
  RESUME_REVIEW: ApplicationStatus.SCREENING,
  PHONE_SCREEN: ApplicationStatus.SCREENING,
  TECHNICAL_INTERVIEW: ApplicationStatus.INTERVIEW,
  ONSITE_INTERVIEW: ApplicationStatus.INTERVIEW,
  OFFER_EXTENDED: ApplicationStatus.OFFER,
  OFFER_ACCEPTED: ApplicationStatus.HIRED,
  REJECTED: ApplicationStatus.REJECTED,
};

function mapActorTypeForActivity(actor: AssistantActor): ActorType {
  return actor.actorType === 'CONSULTANT' ? ActorType.CONSULTANT : ActorType.HRM8_USER;
}

async function getCompanyScopedApplication(actor: AssistantActor, applicationId: string) {
  if (actor.actorType !== 'COMPANY_USER') {
    throw new Error('This action is currently available only for company users.');
  }

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      job: {
        is: {
          company_id: actor.companyId,
        },
      },
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company_id: true,
        },
      },
      candidate: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
    },
  });

  if (!application) {
    throw new Error('Application not found in your company scope.');
  }

  return application;
}

async function getCompanyScopedInterview(actor: AssistantActor, interviewId: string) {
  if (actor.actorType !== 'COMPANY_USER') {
    throw new Error('This action is currently available only for company users.');
  }

  const interview = await prisma.videoInterview.findFirst({
    where: {
      id: interviewId,
      application: {
        is: {
          job: {
            is: {
              company_id: actor.companyId,
            },
          },
        },
      },
    },
    include: {
      application: {
        include: {
          candidate: {
            select: {
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          job: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  if (!interview) {
    throw new Error('Interview not found in your company scope.');
  }

  return interview;
}

async function getCompanyUserInfo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  return {
    id: userId,
    name: user?.name || 'Unknown User',
    email: user?.email || '',
  };
}

function parseApplicationNotes(rawNotes: unknown): any[] {
  if (!rawNotes) return [];

  if (Array.isArray(rawNotes)) {
    return rawNotes;
  }

  if (typeof rawNotes === 'string') {
    try {
      const parsed = JSON.parse(rawNotes);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      const legacyText = rawNotes.trim();
      if (!legacyText) return [];
      return [
        {
          id: 'legacy-text-note',
          content: legacyText,
          mentions: [],
          noteType: 'general',
          source: 'legacy_text',
          createdAt: new Date().toISOString(),
          author: {
            id: 'system',
            name: 'Imported Note',
            email: '',
          },
        },
      ];
    }
  }

  return [];
}

const communicationService = new CommunicationService();

// ============================================================================
// TOOL SCHEMAS
// ============================================================================

export const getCandidateCompleteOverviewSchema = z.object({
  candidateQuery: textQuerySchema.optional().describe('Candidate ID, email, or full name'),
  applicationId: uuidSchema.optional().describe('Application ID from candidate assessment context'),
  includeAssessments: z.boolean().optional().default(true),
  includeInterviews: z.boolean().optional().default(true),
  includeOffers: z.boolean().optional().default(true),
}).refine((value) => Boolean(value.candidateQuery || value.applicationId), {
  message: 'Provide candidateQuery or applicationId.',
});

export const getJobCompleteDashboardSchema = z.object({
  jobQuery: textQuerySchema.describe('Job ID, job code, job title, or company name/domain'),
  includeAnalytics: z.boolean().optional().default(true),
});

export const getConsultantPerformanceSchema = z.object({
  consultantQuery: textQuerySchema.optional().describe('Consultant ID or email (admins only)'),
  timeRange: timeRangeSchema,
});

export const getConsultantCommissionSchema = z.object({
  consultantQuery: textQuerySchema.optional().describe('Consultant ID or email (admins only)'),
  status: z.enum(['ALL', 'PENDING', 'APPROVED', 'PAID', 'WITHDRAWN']).optional().default('ALL'),
});

export const getHiringFunnelAnalyticsSchema = z.object({
  scope: z.enum(['company', 'region', 'job']),
  identifier: z.string().optional(),
  timeRange: timeRangeSchema,
});

export const getInterviewDetailsSchema = z.object({
  applicationId: z.string().uuid().nullish().transform((val) => val || undefined),
  jobQuery: textQuerySchema.optional(),
  candidateQuery: textQuerySchema.optional(),
});

export const getCandidateDrawerContextSchema = z.object({
  applicationId: uuidSchema,
  includeEmailThreads: z.boolean().optional().default(true),
  includeActivities: z.boolean().optional().default(true),
  includeAnnotations: z.boolean().optional().default(true),
});

export const getCandidateDrawerOverviewSchema = z.object({
  applicationId: uuidSchema,
});

export const getCandidateDrawerResumeSchema = z.object({
  applicationId: uuidSchema,
});

export const getCandidateDrawerAiReviewSchema = z.object({
  applicationId: uuidSchema,
});

export const getCandidateDrawerNotesSchema = z.object({
  applicationId: uuidSchema,
});

export const getCandidateDrawerQuestionnaireSchema = z.object({
  applicationId: uuidSchema,
});

export const getCandidateDrawerAnnotationsSchema = z.object({
  applicationId: uuidSchema,
});

export const getCandidateDrawerMeetingsSchema = z.object({
  applicationId: uuidSchema,
});

export const getCandidateDrawerEmailsSchema = z.object({
  applicationId: uuidSchema,
  includeThreads: z.boolean().optional().default(true),
});

export const getCandidateDrawerTasksSchema = z.object({
  applicationId: uuidSchema,
});

export const getCandidateDrawerActivitySchema = z.object({
  applicationId: uuidSchema,
  limit: z.number().int().min(1).max(300).optional().default(200),
});

export const updateCandidateStageSchema = z.object({
  applicationId: uuidSchema,
  stage: z.nativeEnum(ApplicationStage),
  reason: z.string().trim().max(300).optional(),
});

export const addCandidateNoteSchema = z.object({
  applicationId: uuidSchema,
  content: z.string().trim().min(1).max(4000),
  mentions: z.array(uuidSchema).optional().default([]),
  noteType: z.enum(['general', 'questionnaire', 'annotation', 'interview']).optional().default('general'),
});

export const scheduleCandidateInterviewSchema = z.object({
  applicationId: uuidSchema,
  scheduledDate: z.string().datetime().describe('Interview start datetime in ISO 8601 format'),
  duration: z.number().int().min(15).max(240).optional().default(60),
  type: z.nativeEnum(VideoInterviewType).optional().default(VideoInterviewType.VIDEO),
  interviewerIds: z.array(uuidSchema).optional().default([]),
  notes: z.string().trim().max(2000).optional(),
  useMeetLink: z.boolean().optional().default(false),
});

export const addInterviewNoteSchema = z.object({
  applicationId: uuidSchema.optional(),
  interviewId: uuidSchema,
  content: z.string().trim().min(1).max(2000),
});

export const sendCandidateEmailToolSchema = z.object({
  applicationId: uuidSchema,
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(25000),
  cc: z.array(z.string().trim().email()).optional().default([]),
});

export const createCandidateTaskToolSchema = z.object({
  applicationId: uuidSchema,
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).optional(),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.PENDING),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
  type: z.string().trim().max(100).optional(),
  assignedTo: uuidSchema.optional(),
  dueDate: z.string().datetime().optional(),
});

export const addTaskNoteToolSchema = z.object({
  applicationId: uuidSchema,
  taskId: uuidSchema,
  note: z.string().trim().min(1).max(2000),
});

export const getAssessmentResultsSchema = z.object({
  applicationId: uuidSchema,
  includeResponses: z.boolean().optional().default(false),
});

export const getOfferStatusSchema = z.object({
  applicationId: z.string().uuid().nullish().transform((val) => val || undefined),
  candidateQuery: textQuerySchema.optional(),
  jobQuery: textQuerySchema.optional(),
});

export const getLeadPipelineSchema = z.object({
  regionId: z.string().uuid().nullish().transform((val) => val || undefined),
  consultantQuery: textQuerySchema.optional(),
  status: z.enum(['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED']).optional().default('ALL'),
});

export const getCompanyFinancialSummarySchema = z.object({
  companyId: z.string().uuid().nullish().transform((val) => val || undefined),
  timeRange: timeRangeSchema,
});

export const getCommunicationHistorySchema = z.object({
  entityType: z.enum(['candidate', 'company', 'job', 'application']),
  entityId: z.string(),
  communicationType: z.enum(['email', 'call', 'sms', 'notification', 'all']).optional().default('all'),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export const getActivityFeedSchema = z.object({
  scope: z.enum(['job', 'candidate', 'company', 'consultant']),
  identifier: z.string(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  activityTypes: z.array(z.string()).optional(),
});


export const getMyDailyBriefingSchema = z.object({});

export const getRegionalPerformanceSchema = z.object({
  regionId: z
    .string()
    .uuid()
    .nullish()
    .transform((val) => val || undefined)
    .describe('Optional region UUID. Leave empty or omit to use all your assigned regions.'),
  timeRange: timeRangeSchema,
});

// New consultant-specific tool schemas
export const getMyCompaniesSchema = z.object({
  status: z.enum(['ACTIVE', 'ALL']).optional().default('ACTIVE'),
});

export const getMyCandidatesSchema = z.object({
  status: z.enum(['ALL', 'NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']).optional().default('ALL'),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export const getMyQuickStatsSchema = z.object({});

// New admin search tool schemas
export const searchConsultantsSchema = z.object({
  query: textQuerySchema.describe('Consultant name, email, or partial match. Required field.'),
  regionId: z
    .string()
    .uuid()
    .nullish()
    .transform((val) => val || undefined)
    .describe('Optional region UUID to filter results. Leave empty or omit to search all accessible regions.'),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export const searchCandidatesByNameSchema = z.object({
  query: textQuerySchema.describe('Candidate name or email'),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

// New admin monitoring tools
export const getRecentAuditLogsSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(5),
  entityType: z.enum(['USER', 'JOB', 'APPLICATION', 'COMPANY', 'CONSULTANT', 'ALL']).optional().default('ALL'),
  actionType: z.enum(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'ALL']).optional().default('ALL'),
});

export const getRevenueAnalyticsSchema = z.object({
  timeRange: z.enum(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR', 'ALL_TIME']).optional().default('THIS_MONTH'),
  regionId: z.string().uuid().nullish().transform((val) => val || undefined).describe('Optional region UUID to filter results. Leave empty to use all regions.'),
  includeCompanyBreakdown: z.boolean().optional().default(true),
  includeSharingInsights: z.boolean().optional().default(true).describe('Include HRM8 vs Licensee share details'),
});

export const getLicenseeLeaderboardSchema = z.object({
  timeRange: z.enum(['THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR', 'ALL_TIME']).optional().default('THIS_MONTH'),
  metric: z.enum(['TOTAL_REVENUE', 'HRM8_SHARE', 'PLACEMENTS']).optional().default('TOTAL_REVENUE'),
  limit: z.number().int().min(1).max(20).optional().default(10),
});



// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

/**
 * Get comprehensive candidate overview with all related data
 */
export async function getCandidateCompleteOverview(
  args: Record<string, unknown>,
  actor: AssistantActor
): Promise<unknown> {
  const { candidateQuery, applicationId, includeAssessments, includeInterviews, includeOffers } =
    getCandidateCompleteOverviewSchema.parse(args);

  // Build scope filters
  let applicationScopeWhere: any = {};

  if (actor.actorType === 'COMPANY_USER') {
    applicationScopeWhere = {
      job: { is: { company_id: actor.companyId } },
    };
  } else {
    const regionScope = AssistantAccessControl.getRegionScope(actor);
    if (regionScope && regionScope.length > 0) {
      applicationScopeWhere = {
        job: { is: { region_id: { in: regionScope } } },
      };
    }

    // Consultants: only assigned jobs
    if (AssistantAccessControl.isConsultant(actor)) {
      applicationScopeWhere = {
        job: { is: { ...applicationScopeWhere.job?.is, assigned_consultant_id: actor.userId } },
      };
    }
  }

  let candidateIdFromApplication: string | undefined;
  if (applicationId) {
    const scopedApplication = await prisma.application.findFirst({
      where: {
        id: applicationId,
        ...applicationScopeWhere,
      },
      select: {
        id: true,
        candidate_id: true,
      },
    });

    if (!scopedApplication) {
      return { found: false, reason: 'Application not found in your access scope.' };
    }

    candidateIdFromApplication = scopedApplication.candidate_id;
  }

  if (!candidateQuery && !candidateIdFromApplication) {
    return { found: false, reason: 'Please provide candidateQuery or applicationId.' };
  }

  // Find candidate
  const candidate = await prisma.candidate.findFirst({
    where: {
      OR: [
        ...(candidateIdFromApplication ? [{ id: candidateIdFromApplication }] : []),
        ...(candidateQuery
          ? [
            { id: candidateQuery },
            { email: { equals: candidateQuery, mode: 'insensitive' as const } },
            {
              AND: candidateQuery.includes(' ')
                ? candidateQuery
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => ({
                    OR: [
                      { first_name: { contains: part, mode: 'insensitive' as const } },
                      { last_name: { contains: part, mode: 'insensitive' as const } },
                    ],
                  }))
                : [
                  {
                    OR: [
                      { first_name: { contains: candidateQuery, mode: 'insensitive' as const } },
                      { last_name: { contains: candidateQuery, mode: 'insensitive' as const } },
                    ],
                  },
                ],
            },
          ]
          : []),
      ],
      applications: { some: applicationScopeWhere },
    },
    include: {
      applications: {
        where: applicationScopeWhere,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              job_code: true,
              company: { select: { name: true, domain: true } },
              status: true,
            },
          },
        },
        orderBy: { updated_at: 'desc' },
        take: 10,
      },
    },
  });

  if (!candidate) {
    return { found: false, reason: 'Candidate not found in your access scope.' };
  }

  const applicationIds = candidate.applications.map((app) => app.id);

  // Fetch additional data in parallel
  const [assessments, interviews, offers, recentActivity] = await Promise.all([
    // Assessment data structure doesn't match - skip for now
    Promise.resolve([]),

    includeInterviews && applicationIds.length
      ? prisma.videoInterview.findMany({
        where: { application_id: { in: applicationIds } },
        select: {
          id: true,
          application_id: true,
          scheduled_date: true,
          status: true,
          type: true,
          duration: true,
        },
        orderBy: { scheduled_date: 'desc' },
        take: 10,
      })
      : Promise.resolve([]),

    includeOffers && applicationIds.length
      ? prisma.offerLetter.findMany({
        where: { application_id: { in: applicationIds } },
        select: {
          id: true,
          application_id: true,
          job_id: true,
          status: true,
          sent_date: true,
          expiry_date: true,
          responded_date: true,
          offer_negotiation: {
            select: { id: true, created_at: true },
            orderBy: { created_at: 'desc' },
            take: 3,
          },
        },
        orderBy: { created_at: 'desc' },
        take: 5,
      })
      : Promise.resolve([]),

    // Activity model doesn't support generic entity tracking
    // Skip for now - would need separate candidate activity tracking
    Promise.resolve([]),
  ]);

  return {
    found: true,
    candidate: {
      id: candidate.id,
      fullName: `${candidate.first_name} ${candidate.last_name}`.trim(),
      email: candidate.email,
      phone: candidate.phone,
      status: candidate.status,
      updatedAt: candidate.updated_at,
    },
    applications: candidate.applications.map((app) => ({
      id: app.id,
      jobId: app.job_id,
      jobTitle: app.job.title,
      jobCode: app.job.job_code,
      companyName: app.job.company?.name,
      status: app.status,
      stage: app.stage,
      score: app.score,
      appliedDate: app.applied_date,
      updatedAt: app.updated_at,
    })),
    assessments: [], // Assessment data structure doesn't match schema
    interviews: interviews.map((vi) => ({
      id: vi.id,
      applicationId: vi.application_id,
      scheduledDate: vi.scheduled_date,
      status: vi.status,
      type: vi.type,
      duration: vi.duration,
    })),
    offers: offers.map((offer) => ({
      id: offer.id,
      applicationId: offer.application_id,
      jobId: offer.job_id,
      status: offer.status,
      sentDate: offer.sent_date,
      expiryDate: offer.expiry_date,
      respondedDate: offer.responded_date,
      negotiationsCount: (offer as any).offer_negotiation?.length || 0,
    })),
    recentActivity: [], // Activity model doesn't support generic entity tracking
    summary: {
      totalApplications: candidate.applications.length,
      assessmentsCompleted: assessments.length,
      interviewsScheduled: interviews.length,
      offersReceived: offers.length,
    },
  };
}

/**
 * Get comprehensive job dashboard with all metrics
 */
export async function getJobCompleteDashboard(
  args: Record<string, unknown>,
  actor: AssistantActor
): Promise<unknown> {
  const { jobQuery, includeAnalytics } = getJobCompleteDashboardSchema.parse(args);

  const searchTokens = extractSearchTokens(jobQuery);
  const tokenFilter = buildTokenAndFilter(searchTokens, ['title', 'job_code', 'company.name', 'company.domain']);

  // Build base scope
  let baseWhere: any = {};
  if (actor.actorType === 'COMPANY_USER') {
    baseWhere.company_id = actor.companyId;
  } else {
    const regionScope = AssistantAccessControl.getRegionScope(actor);
    if (regionScope && regionScope.length > 0) {
      baseWhere.region_id = { in: regionScope };
    }

    if (AssistantAccessControl.isConsultant(actor)) {
      baseWhere.assigned_consultant_id = actor.userId;
    }
  }

  // Find job
  const job = await prisma.job.findFirst({
    where: {
      ...baseWhere,
      OR: [
        { id: jobQuery },
        { job_code: { equals: jobQuery, mode: 'insensitive' } },
        { title: { contains: jobQuery, mode: 'insensitive' } },
        { company: { is: { name: { contains: jobQuery, mode: 'insensitive' } } } },
        { company: { is: { domain: { contains: jobQuery, mode: 'insensitive' } } } },
        ...(tokenFilter ? [tokenFilter] : []),
      ],
    },
    include: {
      company: { select: { id: true, name: true, domain: true } },
      _count: { select: { applications: true } },
    },
  });

  if (!job) {
    return { found: false, reason: 'Job not found in your access scope.' };
  }

  // Fetch related data in parallel
  const [pipelineByStage, pipelineByStatus, topCandidates, upcomingInterviews, pendingOffers, analytics] =
    await Promise.all([
      prisma.application.groupBy({
        by: ['stage'],
        where: { job_id: job.id },
        _count: { _all: true },
      }),

      prisma.application.groupBy({
        by: ['status'],
        where: { job_id: job.id },
        _count: { _all: true },
      }),

      prisma.application.findMany({
        where: { job_id: job.id, status: { in: ['SCREENING', 'INTERVIEW', 'OFFER'] } },
        include: {
          candidate: { select: { id: true, first_name: true, last_name: true, email: true } },
        },
        orderBy: [{ score: 'desc' }, { updated_at: 'desc' }],
        take: 10,
      }),

      prisma.videoInterview.findMany({
        where: {
          job_id: job.id,
          scheduled_date: { gte: new Date() },
          status: { in: ['SCHEDULED'] },
        },
        select: {
          id: true,
          candidate_id: true,
          scheduled_date: true,
          type: true,
          status: true,
        },
        orderBy: { scheduled_date: 'asc' },
        take: 10,
      }),

      prisma.offerLetter.findMany({
        where: {
          job_id: job.id,
          status: { in: ['SENT', 'UNDER_NEGOTIATION'] },
        },
        select: {
          id: true,
          candidate_id: true,
          status: true,
          sent_date: true,
          expiry_date: true,
        },
        orderBy: { sent_date: 'desc' },
        take: 5,
      }),

      // JobAnalytics only tracks events, not aggregates - skip for now
      Promise.resolve(null),
    ]);

  return {
    found: true,
    job: {
      id: job.id,
      jobCode: job.job_code,
      title: job.title,
      status: job.status,
      companyName: job.company?.name,
      companyDomain: job.company?.domain,
      location: job.location,
      department: job.department,
      vacancies: job.number_of_vacancies,
      assignmentMode: job.assignment_mode,
      assignedConsultantId: job.assigned_consultant_id,
      postedAt: job.posted_at,
      closeDate: job.close_date,
      updatedAt: job.updated_at,
    },
    pipeline: {
      byStage: pipelineByStage.map((item) => ({ stage: item.stage, count: item._count._all })),
      byStatus: pipelineByStatus.map((item) => ({ status: item.status, count: item._count._all })),
      totalApplications: job._count.applications,
    },
    topCandidates: topCandidates.map((app) => ({
      applicationId: app.id,
      candidateName: `${app.candidate.first_name} ${app.candidate.last_name}`.trim(),
      candidateEmail: app.candidate.email,
      status: app.status,
      stage: app.stage,
      score: app.score,
      updatedAt: app.updated_at,
    })),
    upcomingInterviews: upcomingInterviews.map((vi) => ({
      candidateId: vi.candidate_id,
      scheduledDate: vi.scheduled_date,
      type: vi.type,
      status: vi.status,
    })),
    pendingOffers: pendingOffers.map((offer) => ({
      candidateId: offer.candidate_id,
      status: offer.status,
      sentDate: offer.sent_date,
      expiryDate: offer.expiry_date,
    })),
    analytics: null, // JobAnalytics doesn't store aggregates
  };
}

/**
 * Get consultant performance metrics
 */
export async function getConsultantPerformance(
  args: Record<string, unknown>,
  actor: AssistantActor
): Promise<unknown> {
  const { consultantQuery, timeRange } = getConsultantPerformanceSchema.parse(args);

  // Enforce self-scope for consultants
  const consultantId = await AssistantAccessControl.enforceConsultantSelfScope(actor, consultantQuery);

  // Build time filter
  const timeFilter: any = {};
  if (timeRange?.from) timeFilter.gte = new Date(timeRange.from);
  if (timeRange?.to) timeFilter.lte = new Date(timeRange.to);

  // Fetch consultant data
  const [consultant, assignedJobs, placements, commissions, activities] = await Promise.all([
    prisma.consultant.findUnique({
      where: { id: consultantId },
      include: {
        region: { select: { name: true } },
      },
    }),

    prisma.consultantJobAssignment.findMany({
      where: {
        consultant_id: consultantId,
        ...(Object.keys(timeFilter).length ? { assigned_at: timeFilter } : {}),
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            job_code: true,
            status: true,
            company: { select: { name: true } },
          },
        },
      },
      orderBy: { assigned_at: 'desc' },
      take: 20,
    }),

    prisma.application.groupBy({
      by: ['status'],
      where: {
        job: { is: { assigned_consultant_id: consultantId } },
        ...(Object.keys(timeFilter).length ? { updated_at: timeFilter } : {}),
      },
      _count: { _all: true },
    }),

    prisma.commission.aggregate({
      where: {
        consultant_id: consultantId,
        ...(Object.keys(timeFilter).length ? { created_at: timeFilter } : {}),
      },
      _sum: { amount: true },
      _count: { id: true },
    }),

    prisma.activity.count({
      where: {
        created_by: consultantId,
        ...(Object.keys(timeFilter).length ? { created_at: timeFilter } : {}),
      },
    }),
  ]);

  if (!consultant) {
    return { found: false, reason: 'Consultant not found.' };
  }

  return {
    found: true,
    consultant: {
      id: consultant.id,
      name: `${consultant.first_name || ''} ${consultant.last_name || ''}`.trim(),
      email: consultant.email,
      regionName: consultant.region?.name,
      status: consultant.status,
    },
    assignments: {
      total: assignedJobs.length,
      jobs: assignedJobs.map((assignment) => ({
        jobId: assignment.job.id,
        jobTitle: assignment.job.title,
        jobCode: assignment.job.job_code,
        companyName: assignment.job.company?.name,
        status: assignment.job.status,
        assignedAt: assignment.assigned_at,
      })),
    },
    placements: {
      total: placements.reduce((sum, item) => sum + item._count._all, 0),
      byStatus: placements.map((item) => ({ status: item.status, count: item._count._all })),
    },
    commissions: {
      total: commissions._sum.amount || 0,
      count: commissions._count.id,
    },
    activityCount: activities,
  };
}

/**
 * Get consultant commission details
 */
export async function getConsultantCommission(
  args: Record<string, unknown>,
  actor: AssistantActor
): Promise<unknown> {
  const { consultantQuery, status } = getConsultantCommissionSchema.parse(args);

  const consultantId = await AssistantAccessControl.enforceConsultantSelfScope(actor, consultantQuery);

  const statusFilter: any = {};
  if (status !== 'ALL') {
    statusFilter.status = status;
  }

  const [commissions, withdrawals, summary] = await Promise.all([
    prisma.commission.findMany({
      where: {
        consultant_id: consultantId,
        ...statusFilter,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        type: true,
        job_id: true,
        created_at: true,
        confirmed_at: true,
        paid_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    }),

    prisma.commissionWithdrawal.findMany({
      where: { consultant_id: consultantId },
      orderBy: { created_at: 'desc' },
      take: 20,
    }),

    prisma.commission.groupBy({
      by: ['status'],
      where: { consultant_id: consultantId },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  return {
    found: true,
    commissions: commissions.map((comm) => ({
      id: comm.id,
      amount: comm.amount,
      status: comm.status,
      type: comm.type,
      jobId: comm.job_id,
      createdAt: comm.created_at,
      confirmedAt: comm.confirmed_at,
      paidAt: comm.paid_at,
    })),
    withdrawals: withdrawals.map((wd) => ({
      id: wd.id,
      amount: wd.amount,
      status: wd.status,
      createdAt: wd.created_at,
      processedAt: wd.processed_at,
    })),
    summary: {
      byStatus: summary.map((item) => ({
        status: item.status,
        amount: item._sum.amount || 0,
        count: item._count.id,
      })),
      totalEarned: summary.reduce((sum, item) => sum + (item._sum.amount || 0), 0),
    },
  };
}

/**
 * Get hiring funnel analytics
 */
export async function getHiringFunnelAnalytics(
  args: Record<string, unknown>,
  actor: AssistantActor
): Promise<unknown> {
  const { scope, identifier, timeRange } = getHiringFunnelAnalyticsSchema.parse(args);

  const timeFilter: any = {};
  if (timeRange?.from) timeFilter.gte = new Date(timeRange.from);
  if (timeRange?.to) timeFilter.lte = new Date(timeRange.to);

  let baseWhere: any = {};

  if (scope === 'company') {
    if (actor.actorType === 'COMPANY_USER') {
      baseWhere.job = { is: { company_id: actor.companyId } };
    } else if (identifier) {
      baseWhere.job = { is: { company_id: identifier } };
    } else {
      return { found: false, reason: 'Company identifier required for company scope.' };
    }
  } else if (scope === 'region') {
    const regionScope = AssistantAccessControl.getRegionScope(actor);
    if (regionScope && regionScope.length > 0) {
      baseWhere.job = { is: { region_id: { in: regionScope } } };
    }
  } else if (scope === 'job') {
    if (!identifier) {
      return { found: false, reason: 'Job identifier required for job scope.' };
    }
    baseWhere.job_id = identifier;
  }

  if (Object.keys(timeFilter).length) {
    baseWhere.created_at = timeFilter;
  }

  const [byStage, byStatus, timeToHireData] = await Promise.all([
    prisma.application.groupBy({
      by: ['stage'],
      where: baseWhere,
      _count: { _all: true },
    }),

    prisma.application.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { _all: true },
    }),

    prisma.application.findMany({
      where: {
        ...baseWhere,
        status: 'HIRED',
        applied_date: { not: null },
      },
      select: {
        applied_date: true,
        updated_at: true,
      },
    }),
  ]);

  const timeToHireValues = timeToHireData
    .map((app) => {
      if (!app.applied_date) return null;
      const days = Math.floor((app.updated_at.getTime() - app.applied_date.getTime()) / (1000 * 60 * 60 * 24));
      return days;
    })
    .filter((val): val is number => val !== null);

  const avgTimeToHire =
    timeToHireValues.length > 0 ? timeToHireValues.reduce((sum, val) => sum + val, 0) / timeToHireValues.length : 0;

  return {
    found: true,
    scope,
    funnel: {
      byStage: byStage.map((item) => ({ stage: item.stage, count: item._count._all })),
      byStatus: byStatus.map((item) => ({ status: item.status, count: item._count._all })),
    },
    metrics: {
      totalApplications: byStatus.reduce((sum, item) => sum + item._count._all, 0),
      avgTimeToHireDays: Math.round(avgTimeToHire),
      hiredCount: timeToHireValues.length,
    },
  };
}

/**
 * Get interview details
 */
export async function getInterviewDetails(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId, jobQuery, candidateQuery } = getInterviewDetailsSchema.parse(args);

  let applicationWhere: any = {};

  if (applicationId) {
    applicationWhere.id = applicationId;
  } else if (candidateQuery || jobQuery) {
    if (candidateQuery) {
      applicationWhere.candidate = {
        OR: [
          { id: candidateQuery },
          { email: { equals: candidateQuery, mode: 'insensitive' } },
          { first_name: { contains: candidateQuery, mode: 'insensitive' } },
          { last_name: { contains: candidateQuery, mode: 'insensitive' } },
        ],
      };
    }
    if (jobQuery) {
      applicationWhere.job = {
        is: {
          OR: [
            { id: jobQuery },
            { job_code: { equals: jobQuery, mode: 'insensitive' } },
            { title: { contains: jobQuery, mode: 'insensitive' } },
          ],
        },
      };
    }
  } else {
    return { found: false, reason: 'Please provide applicationId, candidateQuery, or jobQuery.' };
  }

  // Apply scoping
  if (actor.actorType === 'COMPANY_USER') {
    const existingJobFilter = applicationWhere.job?.is || {};
    applicationWhere.job = { is: { ...existingJobFilter, company_id: actor.companyId } };
  } else {
    const regionScope = AssistantAccessControl.getRegionScope(actor);
    if (regionScope && regionScope.length > 0) {
      const existingJobFilter = applicationWhere.job?.is || {};
      applicationWhere.job = { is: { ...existingJobFilter, region_id: { in: regionScope } } };
    }
  }

  const applications = await prisma.application.findMany({
    where: applicationWhere,
    include: {
      candidate: { select: { first_name: true, last_name: true, email: true } },
      job: { select: { title: true, job_code: true } },
    },
    take: 5,
  });

  if (!applications.length) {
    return { found: false, reason: 'No applications found in your scope.' };
  }

  const applicationIds = applications.map((app) => app.id);

  const interviews = await prisma.videoInterview.findMany({
    where: { application_id: { in: applicationIds } },
    include: {
      application: {
        select: {
          candidate: { select: { first_name: true, last_name: true } },
          job: { select: { title: true } },
        },
      },
      interview_feedback: true,
    },
    orderBy: { scheduled_date: 'desc' },
  });

  return {
    found: true,
    interviews: interviews.map((vi) => ({
      id: vi.id,
      candidateName: `${vi.application.candidate.first_name} ${vi.application.candidate.last_name}`.trim(),
      jobTitle: vi.application.job.title,
      scheduledAt: vi.scheduled_date,
      status: vi.status,
      type: vi.type,
      duration: vi.duration,
      feedbackCount: vi.interview_feedback.length,
    })),
  };
}

/**
 * Shared loader for candidate drawer context
 */
async function getDrawerApplicationCore(actor: AssistantActor, applicationId: string) {
  const scoped = await getCompanyScopedApplication(actor, applicationId);

  const application = await prisma.application.findUnique({
    where: { id: scoped.id },
    include: {
      candidate: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          city: true,
          state: true,
          country: true,
          linked_in_url: true,
          skills: true,
          education: true,
          work_experience: true,
          resumes: {
            orderBy: [{ is_default: 'desc' }, { uploaded_at: 'desc' }],
            take: 2,
          },
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          job_code: true,
          status: true,
          company_id: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!application || !application.candidate || !application.job) {
    throw new Error('Application context not found.');
  }

  const resume = application.candidate.resumes?.[0] || null;
  const notes = parseApplicationNotes(application.recruiter_notes);

  return { application, resume, notes };
}

/**
 * Drawer Overview panel
 */
export async function getCandidateDrawerOverview(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId } = getCandidateDrawerOverviewSchema.parse(args);
  const { application } = await getDrawerApplicationCore(actor, applicationId);

  return {
    found: true,
    scope: {
      applicationId: application.id,
      jobId: application.job_id,
      candidateId: application.candidate_id,
    },
    candidate: {
      id: application.candidate.id,
      name: `${application.candidate.first_name || ''} ${application.candidate.last_name || ''}`.trim(),
      email: application.candidate.email,
      phone: application.candidate.phone,
      location: [application.candidate.city, application.candidate.state, application.candidate.country].filter(Boolean).join(', '),
      linkedIn: application.candidate.linked_in_url,
    },
    application: {
      id: application.id,
      status: application.status,
      stage: application.stage,
      score: application.score,
      rank: application.rank,
      appliedDate: application.applied_date,
      updatedAt: application.updated_at,
      shortlisted: application.shortlisted,
    },
    job: {
      id: application.job.id,
      title: application.job.title,
      code: application.job.job_code,
      status: application.job.status,
      company: application.job.company?.name,
    },
  };
}

/**
 * Drawer Resume panel
 */
export async function getCandidateDrawerResume(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId } = getCandidateDrawerResumeSchema.parse(args);
  const { application, resume } = await getDrawerApplicationCore(actor, applicationId);

  return {
    found: true,
    scope: { applicationId: application.id, candidateId: application.candidate_id },
    resume: resume
      ? {
        id: resume.id,
        fileName: resume.file_name,
        fileUrl: resume.file_url,
        content: resume.content || '',
        uploadedAt: resume.uploaded_at,
      }
      : null,
    profileSignals: {
      skills: application.candidate.skills || [],
      education: application.candidate.education || [],
      workExperience: application.candidate.work_experience || [],
    },
  };
}

/**
 * Drawer AI Review panel
 */
export async function getCandidateDrawerAiReview(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId } = getCandidateDrawerAiReviewSchema.parse(args);
  const { application } = await getDrawerApplicationCore(actor, applicationId);

  return {
    found: true,
    scope: { applicationId: application.id },
    aiAnalysis: application.ai_analysis,
    score: application.score,
    screeningStatus: application.screening_status,
    automatedScreeningScore: application.automated_screening_score,
    manualScreeningStatus: application.manual_screening_status,
  };
}

/**
 * Drawer Notes panel
 */
export async function getCandidateDrawerNotes(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId } = getCandidateDrawerNotesSchema.parse(args);
  const { application, notes } = await getDrawerApplicationCore(actor, applicationId);

  return {
    found: true,
    scope: { applicationId: application.id },
    notes,
    count: notes.length,
  };
}

/**
 * Drawer Questionnaire panel
 */
export async function getCandidateDrawerQuestionnaire(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId } = getCandidateDrawerQuestionnaireSchema.parse(args);
  const application = await getCompanyScopedApplication(actor, applicationId);

  const [data, responses] = await Promise.all([
    prisma.application.findUnique({
      where: { id: application.id },
      select: {
        id: true,
        questionnaire_data: true,
        custom_answers: true,
      },
    }),
    prisma.questionnaireResponse.findMany({
      where: { application_id: application.id },
      orderBy: { submitted_at: 'desc' },
    }),
  ]);

  if (!data) {
    return { found: false, reason: 'Application not found in your company scope.' };
  }

  return {
    found: true,
    scope: { applicationId: data.id },
    questionnaireData: data.questionnaire_data,
    customAnswers: data.custom_answers,
    responses,
  };
}

/**
 * Drawer Annotation panel
 */
export async function getCandidateDrawerAnnotations(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId } = getCandidateDrawerAnnotationsSchema.parse(args);
  const { application, resume } = await getDrawerApplicationCore(actor, applicationId);

  if (!resume) {
    return {
      found: true,
      scope: { applicationId: application.id },
      resumeId: null,
      annotations: [],
      count: 0,
    };
  }

  const annotations = await prisma.resumeAnnotation.findMany({
    where: { resume_id: resume.id },
    orderBy: { created_at: 'asc' },
  });

  return {
    found: true,
    scope: { applicationId: application.id, resumeId: resume.id },
    annotations,
    count: annotations.length,
  };
}

/**
 * Drawer Meetings/Interviews panel
 */
export async function getCandidateDrawerMeetings(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId } = getCandidateDrawerMeetingsSchema.parse(args);
  const application = await getCompanyScopedApplication(actor, applicationId);

  const interviews = await prisma.videoInterview.findMany({
    where: { application_id: application.id },
    include: {
      interview_notes: {
        orderBy: { created_at: 'desc' },
      },
      interview_feedback: true,
      job_round: { select: { id: true, name: true } },
    },
    orderBy: { scheduled_date: 'desc' },
  });

  return {
    found: true,
    scope: { applicationId: application.id },
    interviews,
    count: interviews.length,
  };
}

/**
 * Drawer Email panel
 */
export async function getCandidateDrawerEmails(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId, includeThreads } = getCandidateDrawerEmailsSchema.parse(args);
  const { application } = await getDrawerApplicationCore(actor, applicationId);

  const [emailLogs, gmailThreads] = await Promise.all([
    communicationService.getEmailLogs(application.id),
    includeThreads && application.candidate.email
      ? gmailService
        .getThreadsForCandidate(actor.userId, application.job.company_id, application.candidate.email)
        .catch(() => [])
      : Promise.resolve([]),
  ]);

  return {
    found: true,
    scope: { applicationId: application.id },
    gmailThreads,
    emailLogs,
    gmailConnected: gmailThreads.length > 0,
  };
}

/**
 * Drawer Task panel
 */
export async function getCandidateDrawerTasks(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId } = getCandidateDrawerTasksSchema.parse(args);
  const application = await getCompanyScopedApplication(actor, applicationId);
  const tasks = await ApplicationTaskService.getTasks(application.id);

  return {
    found: true,
    scope: { applicationId: application.id },
    tasks,
    taskNotes: tasks.map((task) => ({
      taskId: task.id,
      title: task.title,
      note: task.description || '',
    })),
    count: tasks.length,
  };
}

/**
 * Drawer Activity panel
 */
export async function getCandidateDrawerActivity(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId, limit } = getCandidateDrawerActivitySchema.parse(args);
  const application = await getCompanyScopedApplication(actor, applicationId);
  const activity = await ApplicationActivityService.list(application.id, limit);

  return {
    found: true,
    scope: { applicationId: application.id },
    activity,
    count: activity.length,
  };
}

/**
 * Get full context data for candidate assessment drawer
 */
export async function getCandidateDrawerContext(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId, includeEmailThreads, includeActivities, includeAnnotations } =
    getCandidateDrawerContextSchema.parse(args);
  const application = await getCompanyScopedApplication(actor, applicationId);

  const fullApplication = await prisma.application.findFirst({
    where: {
      id: application.id,
    },
    include: {
      candidate: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          city: true,
          state: true,
          country: true,
          linked_in_url: true,
          skills: true,
          education: true,
          work_experience: true,
          resumes: {
            orderBy: [{ is_default: 'desc' }, { uploaded_at: 'desc' }],
            take: 2,
          },
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          job_code: true,
          status: true,
          company_id: true,
          company: { select: { id: true, name: true } },
        },
      },
      video_interview: {
        include: {
          interview_notes: {
            orderBy: { created_at: 'desc' },
          },
        },
        orderBy: { scheduled_date: 'desc' },
      },
    },
  });

  if (!fullApplication) {
    return { found: false, reason: 'Application not found in your company scope.' };
  }

  const resume = fullApplication.candidate?.resumes?.[0] || null;

  const [tasks, activities, emailLogs, annotations, gmailThreads] = await Promise.all([
    ApplicationTaskService.getTasks(fullApplication.id),
    includeActivities ? ApplicationActivityService.list(fullApplication.id, 200) : Promise.resolve([]),
    communicationService.getEmailLogs(fullApplication.id),
    includeAnnotations && resume
      ? prisma.resumeAnnotation.findMany({
        where: { resume_id: resume.id },
        orderBy: { created_at: 'asc' },
      })
      : Promise.resolve([]),
    includeEmailThreads && fullApplication.candidate?.email
      ? gmailService
        .getThreadsForCandidate(actor.userId, fullApplication.job.company_id, fullApplication.candidate.email)
        .catch(() => [])
      : Promise.resolve([]),
  ]);

  const notes = parseApplicationNotes(fullApplication.recruiter_notes);

  return {
    found: true,
    scope: {
      applicationId: fullApplication.id,
      jobId: fullApplication.job_id,
      candidateId: fullApplication.candidate_id,
    },
    candidate: {
      id: fullApplication.candidate?.id,
      name: `${fullApplication.candidate?.first_name || ''} ${fullApplication.candidate?.last_name || ''}`.trim(),
      email: fullApplication.candidate?.email,
      phone: fullApplication.candidate?.phone,
      location: [fullApplication.candidate?.city, fullApplication.candidate?.state, fullApplication.candidate?.country]
        .filter(Boolean)
        .join(', '),
      linkedIn: fullApplication.candidate?.linked_in_url,
      resume: resume
        ? {
          id: resume.id,
          fileName: resume.file_name,
          fileUrl: resume.file_url,
          content: resume.content || '',
          uploadedAt: resume.uploaded_at,
        }
        : null,
      skills: fullApplication.candidate?.skills || [],
      education: fullApplication.candidate?.education || [],
      workExperience: fullApplication.candidate?.work_experience || [],
    },
    application: {
      id: fullApplication.id,
      status: fullApplication.status,
      stage: fullApplication.stage,
      score: fullApplication.score,
      aiAnalysis: fullApplication.ai_analysis,
      appliedDate: fullApplication.applied_date,
      updatedAt: fullApplication.updated_at,
      notes,
    },
    job: {
      id: fullApplication.job.id,
      title: fullApplication.job.title,
      code: fullApplication.job.job_code,
      status: fullApplication.job.status,
      company: fullApplication.job.company?.name,
    },
    annotations,
    interviews: fullApplication.video_interview,
    meetings: fullApplication.video_interview.map((item) => ({
      id: item.id,
      type: item.type,
      status: item.status,
      scheduledDate: item.scheduled_date,
      duration: item.duration,
      notes: item.notes,
      interviewNotes: item.interview_notes,
    })),
    tasks,
    taskNotes: tasks.map((task) => ({
      taskId: task.id,
      title: task.title,
      note: task.description || '',
    })),
    activity: activities,
    emails: {
      gmailThreads,
      emailLogs,
      gmailConnected: gmailThreads.length > 0,
    },
    summary: {
      notesCount: notes.length,
      annotationCount: annotations.length,
      meetingsCount: fullApplication.video_interview.length,
      taskCount: tasks.length,
      emailLogCount: emailLogs.length,
      activityCount: activities.length,
    },
  };
}

/**
 * Update candidate stage for an application
 */
export async function updateCandidateStage(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId, stage, reason } = updateCandidateStageSchema.parse(args);
  const application = await getCompanyScopedApplication(actor, applicationId);

  if (application.stage === stage) {
    return {
      success: true,
      noChange: true,
      message: `Candidate is already in ${stage}.`,
      applicationId: application.id,
      stage: application.stage,
      status: application.status,
    };
  }

  const mappedStatus = STAGE_TO_STATUS_MAP[stage] || application.status;

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: {
      stage,
      status: mappedStatus,
    },
    select: {
      id: true,
      stage: true,
      status: true,
      updated_at: true,
    },
  });

  await ApplicationActivityService.logSafe({
    applicationId: application.id,
    actorId: actor.userId,
    actorType: mapActorTypeForActivity(actor),
    action: 'stage_changed',
    subject: 'Candidate stage changed',
    description: reason
      ? `Stage changed from ${application.stage} to ${stage}. Reason: ${reason}`
      : `Stage changed from ${application.stage} to ${stage}`,
    metadata: {
      previousStage: application.stage,
      newStage: stage,
      previousStatus: application.status,
      newStatus: mappedStatus,
      reason,
      source: 'assistant_tool',
    },
  });

  return {
    success: true,
    message: `Moved candidate to ${updated.stage}.`,
    applicationId: updated.id,
    previousStage: application.stage,
    stage: updated.stage,
    status: updated.status,
    updatedAt: updated.updated_at,
  };
}

/**
 * Add note to candidate application
 */
export async function addCandidateNote(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId, content, mentions, noteType } = addCandidateNoteSchema.parse(args);
  const application = await getCompanyScopedApplication(actor, applicationId);
  const author = await getCompanyUserInfo(actor.userId);

  const existingNotes = parseApplicationNotes(application.recruiter_notes);
  const note = {
    id: crypto.randomUUID(),
    content,
    mentions,
    noteType,
    source: 'assistant_tool',
    createdAt: new Date().toISOString(),
    author,
  };

  const nextNotes = [...existingNotes, note];

  await prisma.application.update({
    where: { id: application.id },
    data: {
      recruiter_notes: JSON.stringify(nextNotes),
    },
  });

  await ApplicationActivityService.logSafe({
    applicationId: application.id,
    actorId: actor.userId,
    actorType: mapActorTypeForActivity(actor),
    action: 'note_added',
    subject: 'Application note added',
    description: `Added ${noteType} note via assistant`,
    metadata: {
      noteId: note.id,
      mentions,
      noteType,
      source: 'assistant_tool',
    },
  });

  return {
    success: true,
    message: 'Note added to candidate application.',
    applicationId: application.id,
    note,
    totalNotes: nextNotes.length,
  };
}

/**
 * Schedule interview for candidate
 */
export async function scheduleCandidateInterview(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId, scheduledDate, duration, type, interviewerIds, notes, useMeetLink } =
    scheduleCandidateInterviewSchema.parse(args);

  const application = await getCompanyScopedApplication(actor, applicationId);
  const interviewDate = new Date(scheduledDate);

  if (Number.isNaN(interviewDate.getTime())) {
    throw new Error('Invalid scheduledDate. Use ISO datetime format.');
  }

  const interview = await InterviewService.createInterview({
    applicationId: application.id,
    scheduledBy: actor.userId,
    scheduledDate: interviewDate,
    duration,
    type,
    interviewerIds,
    notes,
    useMeetLink,
    companyId: application.job.company_id,
  });

  await ApplicationActivityService.logSafe({
    applicationId: application.id,
    actorId: actor.userId,
    actorType: mapActorTypeForActivity(actor),
    action: 'interview_scheduled',
    subject: 'Interview scheduled',
    description: `${type} interview scheduled for ${interviewDate.toISOString()}`,
    metadata: {
      interviewId: (interview as any).id,
      type,
      duration,
      scheduledDate: interviewDate.toISOString(),
      interviewerIds,
      useMeetLink,
      source: 'assistant_tool',
    },
  });

  return {
    success: true,
    message: 'Interview scheduled successfully.',
    interview: {
      id: (interview as any).id,
      applicationId: application.id,
      type: (interview as any).type,
      status: (interview as any).status,
      scheduledDate: (interview as any).scheduled_date,
      duration: (interview as any).duration,
      meetingLink: (interview as any).meeting_link,
      meetLinkError: (interview as any)._meetLinkError || null,
    },
  };
}

/**
 * Add note to an interview
 */
export async function addInterviewNote(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId, interviewId, content } = addInterviewNoteSchema.parse(args);
  const interview = await getCompanyScopedInterview(actor, interviewId);

  if (applicationId && interview.application_id !== applicationId) {
    throw new Error('Interview does not belong to the current candidate context.');
  }

  const author = await getCompanyUserInfo(actor.userId);

  const note = await prisma.interviewNote.create({
    data: {
      interview_id: interview.id,
      author_id: author.id,
      author_name: author.name,
      content,
    },
  });

  await ApplicationActivityService.logSafe({
    applicationId: interview.application_id,
    actorId: actor.userId,
    actorType: mapActorTypeForActivity(actor),
    action: 'interview_note_added',
    subject: 'Interview note added',
    description: `${author.name} added an interview note via assistant`,
    metadata: {
      interviewId: interview.id,
      noteId: note.id,
      source: 'assistant_tool',
    },
  });

  return {
    success: true,
    message: 'Interview note added.',
    note: {
      id: note.id,
      interviewId: note.interview_id,
      content: note.content,
      authorName: note.author_name,
      createdAt: note.created_at,
    },
  };
}

/**
 * Send email to candidate for an application
 */
export async function sendCandidateEmailTool(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId, subject, body, cc } = sendCandidateEmailToolSchema.parse(args);
  const application = await getCompanyScopedApplication(actor, applicationId);

  const result = await communicationService.sendCandidateEmail({
    applicationId: application.id,
    userId: actor.userId,
    subject,
    body,
    cc,
  });

  return {
    success: true,
    message: 'Email sent to candidate.',
    applicationId: application.id,
    emailLog: result.emailLog,
    needsReconnect: result.needsReconnect || false,
  };
}

/**
 * Create candidate task in application context
 */
export async function createCandidateTaskTool(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId, title, description, status, priority, type, assignedTo, dueDate } =
    createCandidateTaskToolSchema.parse(args);
  const application = await getCompanyScopedApplication(actor, applicationId);

  const task = await ApplicationTaskService.createTask({
    applicationId: application.id,
    createdBy: actor.userId,
    title,
    description,
    status,
    priority,
    type,
    assignedTo,
    dueDate: dueDate ? new Date(dueDate) : undefined,
  });

  return {
    success: true,
    message: 'Task created.',
    task,
  };
}

/**
 * Add note to task by appending to task description
 */
export async function addTaskNoteTool(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId, taskId, note } = addTaskNoteToolSchema.parse(args);
  const application = await getCompanyScopedApplication(actor, applicationId);

  const task = await prisma.applicationTask.findFirst({
    where: {
      id: taskId,
      application_id: application.id,
    },
  });

  if (!task) {
    throw new Error('Task not found in current candidate context.');
  }

  const stamp = new Date().toISOString();
  const appended = `${task.description ? `${task.description}\n\n` : ''}[${stamp}] ${note}`;

  const updated = await ApplicationTaskService.updateTask(task.id, {
    description: appended,
  }, actor.userId);

  return {
    success: true,
    message: 'Task note added.',
    task: updated,
  };
}

/**
 * Get assessment results
 */
export async function getAssessmentResults(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  // DISABLED: AssessmentResponse model doesn't have application_id field
  // Schema mismatch - needs rework to query by candidate_id instead
  return {
    found: false,
    reason: 'Assessment results not available - schema mismatch.',
  };
}

/**
 * Get offer status and negotiations
 */
export async function getOfferStatus(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { applicationId, candidateQuery, jobQuery } = getOfferStatusSchema.parse(args);

  let applicationWhere: any = {};

  if (applicationId) {
    applicationWhere.id = applicationId;
  } else if (candidateQuery || jobQuery) {
    if (candidateQuery) {
      applicationWhere.candidate = {
        OR: [
          { id: candidateQuery },
          { email: { equals: candidateQuery, mode: 'insensitive' } },
        ],
      };
    }
    if (jobQuery) {
      applicationWhere.job = {
        is: {
          OR: [
            { id: jobQuery },
            { job_code: { equals: jobQuery, mode: 'insensitive' } },
            { title: { contains: jobQuery, mode: 'insensitive' } },
          ],
        },
      };
    }
  } else {
    return { found: false, reason: 'Please provide applicationId, candidateQuery, or jobQuery.' };
  }

  // Apply scoping
  if (actor.actorType === 'COMPANY_USER') {
    const existingJobFilter = applicationWhere.job?.is || {};
    applicationWhere.job = { is: { ...existingJobFilter, company_id: actor.companyId } };
  } else {
    const regionScope = AssistantAccessControl.getRegionScope(actor);
    if (regionScope && regionScope.length > 0) {
      const existingJobFilter = applicationWhere.job?.is || {};
      applicationWhere.job = { is: { ...existingJobFilter, region_id: { in: regionScope } } };
    }
  }

  const applications = await prisma.application.findMany({
    where: applicationWhere,
    select: { id: true },
    take: 10,
  });

  if (!applications.length) {
    return { found: false, reason: 'No applications found in your scope.' };
  }

  const applicationIds = applications.map((app) => app.id);

  const offers = await prisma.offerLetter.findMany({
    where: { application_id: { in: applicationIds } },
    include: {
      application: {
        include: {
          candidate: { select: { first_name: true, last_name: true, email: true } },
          job: { select: { title: true, company: { select: { name: true } } } },
        },
      },
      offer_negotiation: {
        orderBy: { created_at: 'desc' },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return {
    found: true,
    offers: offers.map((offer) => ({
      id: offer.id,
      candidateName: `${offer.application.candidate.first_name} ${offer.application.candidate.last_name}`.trim(),
      candidateEmail: offer.application.candidate.email,
      jobTitle: offer.application.job.title,
      companyName: offer.application.job.company?.name,
      status: offer.status,
      sentAt: offer.sent_date,
      expiresAt: offer.expiry_date,
      acceptedAt: offer.responded_date,
      rejectedAt: offer.responded_date,
      negotiations: offer.offer_negotiation.map((neg) => ({
        id: neg.id,
        createdAt: neg.created_at,
      })),
    })),
  };
}

/**
 * Get lead pipeline
 */
export async function getLeadPipeline(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { regionId, consultantQuery, status } = getLeadPipelineSchema.parse(args);

  if (actor.actorType === 'COMPANY_USER') {
    return { found: false, reason: 'This tool is only available for HRM8 users and consultants.' };
  }

  let baseWhere: any = {};

  // Apply region scope
  if (regionId) {
    baseWhere.region_id = regionId;
  } else {
    const regionScope = AssistantAccessControl.getRegionScope(actor);
    if (regionScope && regionScope.length > 0) {
      baseWhere.region_id = { in: regionScope };
    }
  }

  // Apply consultant filter
  if (consultantQuery) {
    const consultantId = await AssistantAccessControl.enforceConsultantSelfScope(actor, consultantQuery);
    baseWhere.assigned_consultant_id = consultantId;
  } else if (AssistantAccessControl.isConsultant(actor)) {
    baseWhere.assigned_consultant_id = actor.userId;
  }

  // Apply status filter
  if (status !== 'ALL') {
    baseWhere.status = status;
  }

  // Fetch leads first
  const leads = await prisma.lead.findMany({
    where: baseWhere,
    include: {
      company: { select: { name: true, domain: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 50,
  });

  // Then fetch opportunities for converted companies
  const opportunities = leads.length > 0 && leads.some((l) => l.converted_to_company_id)
    ? await prisma.opportunity.findMany({
      where: {
        company_id: { in: leads.map((l) => l.converted_to_company_id).filter(Boolean) as string[] },
      },
      select: {
        id: true,
        company_id: true,
        name: true,
        stage: true,
        amount: true,
        expected_close_date: true,
        probability: true,
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
    : [];

  return {
    found: true,
    leads: leads.map((lead) => ({
      id: lead.id,
      companyName: lead.company_name,
      email: lead.email,
      status: lead.status,
      leadSource: lead.lead_source,
      createdAt: lead.created_at,
    })),
    opportunities: opportunities.map((opp) => ({
      id: opp.id,
      companyId: opp.company_id,
      name: opp.name,
      stage: opp.stage,
      amount: opp.amount,
      closeDate: opp.expected_close_date,
      probability: opp.probability,
    })),
  };
}

/**
 * Get company financial summary
 */
export async function getCompanyFinancialSummary(
  args: Record<string, unknown>,
  actor: AssistantActor
): Promise<unknown> {
  const { companyId, timeRange } = getCompanyFinancialSummarySchema.parse(args);

  let targetCompanyId: string;

  if (actor.actorType === 'COMPANY_USER') {
    targetCompanyId = actor.companyId;
  } else if (companyId) {
    // Verify company is in scope
    const regionScope = AssistantAccessControl.getRegionScope(actor);
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        ...(regionScope && regionScope.length > 0 ? { region_id: { in: regionScope } } : {}),
      },
      select: { id: true },
    });

    if (!company) {
      return { found: false, reason: 'Company not found in your scope.' };
    }

    targetCompanyId = company.id;
  } else {
    return { found: false, reason: 'Company ID required.' };
  }

  const timeFilter: any = {};
  if (timeRange?.from) timeFilter.gte = new Date(timeRange.from);
  if (timeRange?.to) timeFilter.lte = new Date(timeRange.to);

  const [subscriptions, bills, revenue] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        company_id: targetCompanyId,
        ...(Object.keys(timeFilter).length ? { created_at: timeFilter } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    }),

    prisma.bill.findMany({
      where: {
        company_id: targetCompanyId,
        ...(Object.keys(timeFilter).length ? { created_at: timeFilter } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    }),

    prisma.bill.aggregate({
      where: {
        company_id: targetCompanyId,
        status: 'PAID',
        ...(Object.keys(timeFilter).length ? { paid_at: timeFilter } : {}),
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    found: true,
    subscriptions: subscriptions.map((sub) => ({
      id: sub.id,
      plan: sub.plan_type,
      status: sub.status,
      startDate: sub.start_date,
      endDate: sub.end_date,
    })),
    bills: bills.map((bill) => ({
      id: bill.id,
      amount: bill.amount,
      status: bill.status,
      dueDate: bill.due_date,
      paidAt: bill.paid_at,
    })),
    totalRevenue: revenue._sum.amount || 0,
  };
}

/**
 * Get communication history
 */
export async function getCommunicationHistory(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  // DISABLED: EmailLog, CallLog, SmsLog models are not accessible in Prisma client
  return {
    found: false,
    reason: 'Communication history is not available - log models not configured.',
  };
}

/**
 * Get activity feed
 */
export async function getActivityFeed(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { scope, identifier, limit, activityTypes } = getActivityFeedSchema.parse(args);

  const where: any = {
    entity_type: scope.toUpperCase(),
    entity_id: identifier,
  };

  if (activityTypes && activityTypes.length > 0) {
    where.action = { in: activityTypes };
  }

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: limit,
  });

  return {
    found: true,
    activities: activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      createdAt: activity.created_at,
      createdBy: activity.created_by,
    })),
  };
}

/**
 * Get consultant daily briefing
 */
export async function getMyDailyBriefing(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  if (!AssistantAccessControl.isConsultant(actor)) {
    return { found: false, reason: 'This tool is only available for consultants.' };
  }

  const today = new Date();
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [assignedJobs, upcomingInterviews, pendingApplications, recentCommissions] = await Promise.all([
    prisma.job.findMany({
      where: {
        assigned_consultant_id: actor.userId,
        status: { in: ['OPEN'] },
      },
      select: {
        id: true,
        title: true,
        job_code: true,
        company: { select: { name: true } },
        _count: { select: { applications: true } },
      },
      take: 10,
    }),

    prisma.videoInterview.findMany({
      where: {
        application: {
          is: {
            job: {
              is: { assigned_consultant_id: actor.userId },
            },
          },
        },
        scheduled_date: {
          gte: today,
          lte: sevenDaysFromNow,
        },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      include: {
        application: {
          include: {
            candidate: { select: { first_name: true, last_name: true, email: true } },
            job: { select: { title: true } },
          },
        },
      },
      orderBy: { scheduled_date: 'asc' },
      take: 10,
    }),

    prisma.application.findMany({
      where: {
        job: {
          is: { assigned_consultant_id: actor.userId },
        },
        status: { in: ['NEW', 'SCREENING'] },
      },
      include: {
        candidate: { select: { first_name: true, last_name: true, email: true } },
        job: { select: { title: true } },
      },
      orderBy: { updated_at: 'asc' },
      take: 10,
    }),

    prisma.commission.aggregate({
      where: {
        consultant_id: actor.userId,
        created_at: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  return {
    found: true,
    date: today.toISOString(),
    summary: {
      assignedJobsCount: assignedJobs.length,
      upcomingInterviewsCount: upcomingInterviews.length,
      pendingApplicationsCount: pendingApplications.length,
      monthlyCommissionsAmount: recentCommissions._sum.amount || 0,
      monthlyCommissionsCount: recentCommissions._count.id,
    },
    assignedJobs: assignedJobs.map((job) => ({
      id: job.id,
      title: job.title,
      jobCode: job.job_code,
      companyName: job.company?.name,
      applicationsCount: job._count.applications,
    })),
    upcomingInterviews: upcomingInterviews.map((vi) => ({
      candidateName: `${vi.application.candidate.first_name} ${vi.application.candidate.last_name}`.trim(),
      jobTitle: vi.application.job.title,
      scheduledAt: vi.scheduled_date,
      type: vi.type,
    })),
    pendingApplications: pendingApplications.map((app) => ({
      candidateName: `${app.candidate.first_name} ${app.candidate.last_name}`.trim(),
      jobTitle: app.job.title,
      status: app.status,
      updatedAt: app.updated_at,
    })),
  };
}

/**
 * Get regional performance metrics
 */
export async function getRegionalPerformance(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { regionId, timeRange } = getRegionalPerformanceSchema.parse(args);

  if (actor.actorType === 'COMPANY_USER') {
    return { found: false, reason: 'This tool is only available for HRM8 users.' };
  }

  let targetRegionId: string | undefined;

  if (AssistantAccessControl.isGlobalAdmin(actor)) {
    targetRegionId = regionId;
  } else {
    const regionScope = AssistantAccessControl.getRegionScope(actor);
    if (!regionScope || regionScope.length === 0) {
      return { found: false, reason: 'No assigned regions.' };
    }

    if (regionId) {
      if (!regionScope.includes(regionId)) {
        return { found: false, reason: 'Region not in your scope.' };
      }
      targetRegionId = regionId;
    } else {
      targetRegionId = regionScope[0]; // Default to first assigned region
    }
  }

  if (!targetRegionId) {
    return { found: false, reason: 'Region ID required.' };
  }

  const timeFilter: any = {};
  if (timeRange?.from) timeFilter.gte = new Date(timeRange.from);
  if (timeRange?.to) timeFilter.lte = new Date(timeRange.to);

  const [region, revenue, jobs, placements, consultants] = await Promise.all([
    prisma.region.findUnique({
      where: { id: targetRegionId },
      select: { id: true, name: true, code: true },
    }),

    prisma.regionalRevenue.aggregate({
      where: {
        region_id: targetRegionId,
        ...(Object.keys(timeFilter).length ? { period_start: timeFilter } : {}),
      },
      _sum: { total_revenue: true },
    }),

    prisma.job.count({
      where: {
        region_id: targetRegionId,
        ...(Object.keys(timeFilter).length ? { created_at: timeFilter } : {}),
      },
    }),

    prisma.application.count({
      where: {
        job: { is: { region_id: targetRegionId } },
        status: 'HIRED',
        ...(Object.keys(timeFilter).length ? { updated_at: timeFilter } : {}),
      },
    }),

    prisma.consultant.count({
      where: {
        region_id: targetRegionId,
        status: 'ACTIVE',
      },
    }),
  ]);

  if (!region) {
    return { found: false, reason: 'Region not found.' };
  }

  return {
    found: true,
    region: {
      id: region.id,
      name: region.name,
      code: region.code,
    },
    metrics: {
      totalRevenue: revenue._sum.total_revenue || 0,
      totalJobs: jobs,
      totalPlacements: placements,
      activeConsultants: consultants,
    },
  };
}

// ============================================================================
// NEW CONSULTANT TOOLS
// ============================================================================

/**
 * Get companies the consultant is working with
 */
export async function getMyCompanies(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  if (!AssistantAccessControl.isConsultant(actor)) {
    return { found: false, reason: 'This tool is only available for consultants.' };
  }

  const { status } = getMyCompaniesSchema.parse(args);

  const jobWhere: any = {
    assigned_consultant_id: actor.userId,
  };

  if (status === 'ACTIVE') {
    jobWhere.status = { in: ['OPEN'] }; // Use valid JobStatus enum
  }

  const jobs = await prisma.job.findMany({
    where: jobWhere,
    select: {
      company_id: true,
      company: {
        select: {
          id: true,
          name: true,
          domain: true,
        },
      },
    },
    distinct: ['company_id'],
  });

  // Get additional stats for each company
  const companiesWithStats = await Promise.all(
    jobs.map(async (job) => {
      const [activeJobs, totalCandidates, hiredCount] = await Promise.all([
        prisma.job.count({
          where: {
            company_id: job.company_id,
            assigned_consultant_id: actor.userId,
            status: { in: ['OPEN'] },
          },
        }),

        prisma.application.count({
          where: {
            job: {
              is: {
                company_id: job.company_id,
                assigned_consultant_id: actor.userId,
              },
            },
          },
        }),

        prisma.application.count({
          where: {
            job: {
              is: {
                company_id: job.company_id,
                assigned_consultant_id: actor.userId,
              },
            },
            status: 'HIRED',
          },
        }),
      ]);

      return {
        companyId: job.company.id,
        companyName: job.company.name,
        domain: job.company.domain,
        activeJobs,
        totalCandidates,
        placements: hiredCount,
      };
    })
  );

  return {
    found: true,
    total: companiesWithStats.length,
    companies: companiesWithStats,
  };
}

/**
 * Get candidates in consultant's pipeline
 */
export async function getMyCandidates(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  if (!AssistantAccessControl.isConsultant(actor)) {
    return { found: false, reason: 'This tool is only available for consultants.' };
  }

  const { status, limit } = getMyCandidatesSchema.parse(args);

  const applicationWhere: any = {
    job: {
      is: { assigned_consultant_id: actor.userId },
    },
  };

  if (status !== 'ALL') {
    applicationWhere.status = status;
  }

  const applications = await prisma.application.findMany({
    where: applicationWhere,
    include: {
      candidate: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          job_code: true,
          company: { select: { name: true } },
        },
      },
    },
    orderBy: { updated_at: 'desc' },
    take: limit,
  });

  return {
    found: true,
    total: applications.length,
    candidates: applications.map((app) => ({
      candidateId: app.candidate.id,
      candidateName: `${app.candidate.first_name} ${app.candidate.last_name}`.trim(),
      email: app.candidate.email,
      phone: app.candidate.phone,
      applicationId: app.id,
      jobTitle: app.job.title,
      jobCode: app.job.job_code,
      companyName: app.job.company?.name,
      status: app.status,
      stage: app.stage,
      score: app.score,
      appliedDate: app.applied_date,
      lastUpdated: app.updated_at,
    })),
  };
}

/**
 * Get quick stats dashboard for consultant
 */
export async function getMyQuickStats(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  if (!AssistantAccessControl.isConsultant(actor)) {
    return { found: false, reason: 'This tool is only available for consultants.' };
  }

  const today = new Date();
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [activeJobs, totalCandidates, interviewsThisWeek, pendingCommissions, recentPlacements] = await Promise.all([
    prisma.job.count({
      where: {
        assigned_consultant_id: actor.userId,
        status: { in: ['OPEN'] },
      },
    }),

    prisma.application.count({
      where: {
        job: { is: { assigned_consultant_id: actor.userId } },
        status: { in: ['NEW', 'SCREENING', 'INTERVIEW', 'OFFER'] },
      },
    }),

    prisma.videoInterview.count({
      where: {
        application: {
          is: {
            job: { is: { assigned_consultant_id: actor.userId } },
          },
        },
        scheduled_date: {
          gte: today,
          lte: sevenDaysFromNow,
        },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
    }),

    prisma.commission.aggregate({
      where: {
        consultant_id: actor.userId,
        status: 'PENDING',
      },
      _sum: { amount: true },
      _count: { id: true },
    }),

    prisma.application.count({
      where: {
        job: { is: { assigned_consultant_id: actor.userId } },
        status: 'HIRED',
        updated_at: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  return {
    found: true,
    summary: {
      activeJobs,
      totalCandidatesInPipeline: totalCandidates,
      interviewsThisWeek,
      pendingCommissionsAmount: pendingCommissions._sum.amount || 0,
      pendingCommissionsCount: pendingCommissions._count.id,
      recentPlacements: recentPlacements,
    },
  };
}

// ============================================================================
// NEW ADMIN SEARCH TOOLS
// ============================================================================

/**
 * Search consultants by name, email, or region
 */
export async function searchConsultants(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  if (actor.actorType === 'COMPANY_USER') {
    return { found: false, reason: 'This tool is only available for HRM8 users.' };
  }

  const { query, regionId, limit } = searchConsultantsSchema.parse(args);

  // Build search conditions
  const searchConditions: any[] = [
    { email: { contains: query, mode: 'insensitive' } },
    { first_name: { contains: query, mode: 'insensitive' } },
    { last_name: { contains: query, mode: 'insensitive' } },
  ];

  const where: any = {
    OR: searchConditions,
  };

  // Apply region scope for non-global admins
  const regionScope = AssistantAccessControl.getRegionScope(actor);
  if (regionScope && regionScope.length > 0) {
    where.region_id = { in: regionScope };
  }

  // Apply specific region filter if provided
  if (regionId) {
    where.region_id = regionId;
  }

  const consultants = await prisma.consultant.findMany({
    where,
    include: {
      region: { select: { name: true, code: true } },
    },
    orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    take: limit,
  });

  return {
    found: true,
    total: consultants.length,
    consultants: consultants.map((c) => ({
      id: c.id,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      email: c.email,
      phone: c.phone,
      status: c.status,
      regionName: c.region?.name,
      regionCode: c.region?.code,
    })),
  };
}

/**
 * Search candidates by name or email (improved global search)
 */
export async function searchCandidatesByName(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  const { query, limit } = searchCandidatesByNameSchema.parse(args);

  // Build search conditions
  const searchConditions: any[] = [
    { email: { contains: query, mode: 'insensitive' } },
    { first_name: { contains: query, mode: 'insensitive' } },
    { last_name: { contains: query, mode: 'insensitive' } },
  ];

  // For consultants: only search candidates from their assigned jobs
  let applicationScope: any = {};

  if (actor.actorType === 'COMPANY_USER') {
    applicationScope = {
      applications: {
        some: {
          job: { is: { company_id: actor.companyId } },
        },
      },
    };
  } else {
    const regionScope = AssistantAccessControl.getRegionScope(actor);

    if (AssistantAccessControl.isConsultant(actor)) {
      applicationScope = {
        applications: {
          some: {
            job: { is: { assigned_consultant_id: actor.userId } },
          },
        },
      };
    } else if (regionScope && regionScope.length > 0) {
      applicationScope = {
        applications: {
          some: {
            job: { is: { region_id: { in: regionScope } } },
          },
        },
      };
    }
  }

  const candidates = await prisma.candidate.findMany({
    where: {
      OR: searchConditions,
      ...applicationScope,
    },
    include: {
      applications: {
        include: {
          job: {
            select: {
              title: true,
              job_code: true,
              company: { select: { name: true } },
            },
          },
        },
        orderBy: { updated_at: 'desc' },
        take: 3,
      },
    },
    orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    take: limit,
  });

  return {
    found: true,
    total: candidates.length,
    candidates: candidates.map((c) => ({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`.trim(),
      email: c.email,
      phone: c.phone,
      status: c.status,
      recentApplications: c.applications.map((app) => ({
        jobTitle: app.job.title,
        jobCode: app.job.job_code,
        companyName: app.job.company?.name,
        status: app.status,
        stage: app.stage,
        updatedAt: app.updated_at,
      })),
    })),
  };
}

// ============================================================================
// ADMIN MONITORING TOOLS
// ============================================================================

/**
 * Get recent audit logs for system activity monitoring
 */
export async function getRecentAuditLogs(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  if (actor.actorType === 'COMPANY_USER' || actor.actorType === 'CONSULTANT') {
    return { found: false, reason: 'This tool is only available for administrators.' };
  }

  const { limit, entityType, actionType } = getRecentAuditLogsSchema.parse(args);

  const where: any = {};

  // Apply entity type filter
  if (entityType !== 'ALL') {
    where.entity_type = entityType;
  }

  // Apply action type filter  
  if (actionType !== 'ALL') {
    where.action = actionType;
  }

  const auditLogs = await prisma.auditLog.findMany({
    where,
    orderBy: { performed_at: 'desc' },
    take: limit,
  });

  return {
    found: true,
    total: auditLogs.length,
    logs: auditLogs.map((log) => ({
      id: log.id,
      entityType: log.entity_type,
      entityId: log.entity_id,
      action: log.action,
      description: log.description,
      performedBy: log.performed_by_email || log.performed_by || 'System',
      performedAt: log.performed_at,
      changes: log.changes,
    })),
  };
}

/**
 * Get revenue analytics including splits, cash movement, and company breakdowns
 */
export async function getRevenueAnalytics(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  if (actor.actorType === 'COMPANY_USER' || actor.actorType === 'CONSULTANT') {
    return { found: false, reason: 'This tool is only available for administrators.' };
  }

  const { timeRange, regionId, includeCompanyBreakdown } = getRevenueAnalyticsSchema.parse(args);

  // Build simple time filter inline
  const now = new Date();
  let startDate: Date | undefined;

  switch (timeRange) {
    case 'TODAY':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'THIS_WEEK':
      startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'THIS_MONTH':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'THIS_QUARTER':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'THIS_YEAR':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
  }

  // Determine region scope
  let targetRegionId = regionId;
  if (!targetRegionId) {
    const regionScope = AssistantAccessControl.getRegionScope(actor);
    if (regionScope && regionScope.length === 1) {
      targetRegionId = regionScope[0];
    }
  }

  // Query commission data  
  const commissionWhere: any = {};

  // Add time filter if specified
  if (startDate) {
    commissionWhere.created_at = { gte: startDate };
  }

  // Add region filter if specified
  if (targetRegionId) {
    commissionWhere.consultant = {
      is: { region_id: targetRegionId },
    };
  }

  const [totalCommissions, commissionsByStatus] = await Promise.all([
    // Total commissions aggregate (using only available fields)
    prisma.commission.aggregate({
      where: commissionWhere,
      _sum: { amount: true, rate: true },
      _count: true,
    }),

    // Commissions grouped by status
    prisma.commission.groupBy({
      by: ['status'],
      where: commissionWhere,
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const result: any = {
    found: true,
    timeRange,
    summary: {
      totalRevenue: totalCommissions._sum?.amount || 0,
      totalCommissions: totalCommissions._count || 0,
      averageCommissionRate: totalCommissions._sum?.rate || 0,
    },
    commissionsByStatus: commissionsByStatus.map((group) => ({
      status: group.status,
      amount: group._sum?.amount || 0,
      count: group._count || 0,
    })),
  };

  // Company breakdown if requested (with limit to protect context)
  if (includeCompanyBreakdown) {
    const companyRevenue = await prisma.commission.groupBy({
      by: ['job_id'],
      where: commissionWhere,
      _sum: { amount: true },
      _count: true,
    });

    // Fetch job details to get company info (limit to top results only)
    const jobIds = companyRevenue
      .map((cr) => cr.job_id)
      .filter((id) => id !== null)
      .slice(0, 50); // Limit to protect context

    if (jobIds.length > 0) {
      const jobs = await prisma.job.findMany({
        where: { id: { in: jobIds as string[] } },
        select: {
          id: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const jobMap = new Map(jobs.map((j) => [j.id, j.company]));

      // Aggregate by company
      const companyMap = new Map<string, { name: string; revenue: number; commissionCount: number }>();

      companyRevenue.forEach((cr) => {
        if (cr.job_id) {
          const company = jobMap.get(cr.job_id);
          if (company) {
            const existing = companyMap.get(company.id) || { name: company.name, revenue: 0, commissionCount: 0 };
            existing.revenue += cr._sum?.amount || 0;
            existing.commissionCount += cr._count || 0;
            companyMap.set(company.id, existing);
          }
        }
      });

      result.companyBreakdown = Array.from(companyMap.entries())
        .map(([companyId, data]) => ({
          companyId,
          companyName: data.name,
          revenue: data.revenue,
          commissionCount: data.commissionCount,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15); // Limit to top 15 companies to protect context
    }
  }

  // Include HRM8 vs Licensee share insights if requested
  if (args.includeSharingInsights) {
    const revenueShareData = await prisma.regionalRevenue.aggregate({
      where: {
        ...(targetRegionId ? { region_id: targetRegionId } : {}),
        ...(startDate ? { period_start: { gte: startDate } } : {}),
      },
      _sum: {
        total_revenue: true,
        licensee_share: true,
        hrm8_share: true,
      },
      _count: true,
    });

    if (revenueShareData._count > 0) {
      result.revenueSharing = {
        totalRecognizedRevenue: revenueShareData._sum.total_revenue || 0,
        licenseeShare: revenueShareData._sum.licensee_share || 0,
        hrm8Share: revenueShareData._sum.hrm8_share || 0,
        note: 'Revenue sharing data is based on finalized regional revenue records.',
      };
    } else {
      // Calculate from live commissions if finalized revenue reports are unavailable
      const commissionShareData = await prisma.commission.aggregate({
        where: commissionWhere,
        _sum: { amount: true },
        _count: true,
      });

      const totalRevenue = commissionShareData._sum.amount || 0;
      // Default to 80/20 split for estimation when region-specific data is unavailable in this aggregate view
      const estimatedLicenseeShare = totalRevenue * 0.8;
      const estimatedHrm8Share = totalRevenue * 0.2;

      if (totalRevenue > 0) {
        result.revenueSharing = {
          totalRecognizedRevenue: totalRevenue,
          licenseeShare: estimatedLicenseeShare,
          hrm8Share: estimatedHrm8Share,
        };
      }
    }
  }

  return result;
}

/**
 * Get leaderboard of top performing regional licensees
 */
export async function getLicenseeLeaderboard(args: Record<string, unknown>, actor: AssistantActor): Promise<unknown> {
  // Only Global Admins can see the full leaderboard
  if (!AssistantAccessControl.isGlobalAdmin(actor)) {
    return { found: false, reason: 'This tool is restricted to Global Administrators.' };
  }

  const { timeRange, metric, limit } = getLicenseeLeaderboardSchema.parse(args);

  // Build time filter
  const now = new Date();
  let startDate: Date | undefined;

  switch (timeRange) {
    case 'THIS_MONTH':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'THIS_QUARTER':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'THIS_YEAR':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    // ALL_TIME is default (startDate undefined)
  }

  const where: any = {};
  if (startDate) {
    where.period_start = { gte: startDate };
  }

  // Try fetching from pre-aggregated RegionalRevenue first
  const leaderboardData = await prisma.regionalRevenue.groupBy({
    by: ['region_id'],
    where,
    _sum: {
      total_revenue: true,
      hrm8_share: true,
      licensee_share: true,
    },
  });

  let rankedLicensees: any[] = [];

  // If RegionalRevenue has data, use it
  if (leaderboardData.length > 0) {
    const regionIds = leaderboardData.map((d) => d.region_id);
    const regions = await prisma.region.findMany({
      where: { id: { in: regionIds } },
      select: {
        id: true,
        name: true,
        licensee: {
          select: {
            id: true,
            name: true,
            legal_entity_name: true,
          },
        },
      },
    });

    const regionMap = new Map(regions.map((r) => [r.id, r]));

    rankedLicensees = leaderboardData.map((data) => {
      const region = regionMap.get(data.region_id);
      return {
        regionName: region?.name || 'Unknown Region',
        licenseeName: region?.licensee?.name || region?.licensee?.legal_entity_name || 'Unassigned',
        totalRevenue: data._sum.total_revenue || 0,
        hrm8Share: data._sum.hrm8_share || 0,
        licenseeShare: data._sum.licensee_share || 0,
        source: 'RegionalRevenue (Finalized)',
      };
    });
  } else {
    // Aggregating directly from Commission table for real-time insights
    // This ensures data availability if RegionalRevenue (finalized reports) are not yet generated
    const commissionWhere: any = {};
    if (startDate) {
      commissionWhere.created_at = { gte: startDate };
    }

    // Get commissions grouped by region
    const commissionData = await prisma.commission.groupBy({
      by: ['region_id'],
      where: commissionWhere,
      _sum: {
        amount: true,
      },
      _count: true,
    });

    if (commissionData.length > 0) {
      const regionIds = commissionData.map((d) => d.region_id);
      const regions = await prisma.region.findMany({
        where: { id: { in: regionIds } },
        select: {
          id: true,
          name: true,
          licensee: {
            select: {
              id: true,
              name: true,
              legal_entity_name: true,
              revenue_share_percent: true, // Needed to estimate split
            },
          },
        },
      });

      const regionMap = new Map(regions.map((r) => [r.id, r]));

      rankedLicensees = commissionData.map((data) => {
        const region = regionMap.get(data.region_id);
        const totalRevenue = data._sum.amount || 0;

        // Precise split based on licensee's configured share percentage
        // Default to standard 80/20 (Licensee/HRM8) if not explicitly set
        const licenseeSharePercent = region?.licensee?.revenue_share_percent ?? 80;
        const licenseeShare = (totalRevenue * licenseeSharePercent) / 100;
        const hrm8Share = totalRevenue - licenseeShare;

        return {
          regionName: region?.name || 'Unknown Region',
          licenseeName: region?.licensee?.name || region?.licensee?.legal_entity_name || 'Unassigned',
          totalRevenue,
          hrm8Share,
          licenseeShare,
          placementCount: data._count,
          source: 'Live Commissions',
        };
      });
    }
  }

  // Sort and limit final results
  rankedLicensees.sort((a, b) => {
    if (metric === 'HRM8_SHARE') return b.hrm8Share - a.hrm8Share;
    if (metric === 'PLACEMENTS') return (b.placementCount || 0) - (a.placementCount || 0);
    return b.totalRevenue - a.totalRevenue;
  });

  return {
    found: rankedLicensees.length > 0,
    timeRange,
    metric,
    leaderboard: rankedLicensees.slice(0, limit),
  };
}
