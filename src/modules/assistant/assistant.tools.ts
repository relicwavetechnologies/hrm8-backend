import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { AssistantActor } from './assistant.types';

export interface AssistantTool {
  name: string;
  description: string;
  parameters: z.ZodType<any>;
  run: (args: Record<string, unknown>, actor: AssistantActor) => Promise<unknown>;
}

const textQuerySchema = z.string().trim().min(2).max(120);

const getJobStatusArgs = z.object({
  jobQuery: textQuerySchema.describe('Job ID, job code, job title, or company name/domain'),
});

const getCandidateStatusArgs = z.object({
  candidateQuery: textQuerySchema.describe('Candidate ID, email, or full name'),
  jobQuery: z.string().trim().min(2).max(120).optional(),
});

const getJobPipelineSummaryArgs = z.object({
  jobQuery: textQuerySchema.describe('Job ID, job code, or job title'),
});

const getCompanyHiringOverviewArgs = z.object({
  companyId: z.string().uuid().optional().describe('Optional company UUID, allowed only for HRM8 global admin'),
  companyQuery: z.string().trim().min(2).max(120).optional().describe('Company name/domain/id query'),
});

const searchEntitiesArgs = z.object({
  query: z.string().trim().min(2).max(120),
  entityType: z.enum(['job', 'candidate', 'company', 'application']).optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

const getApplicationTimelineArgs = z
  .object({
    applicationId: z.string().uuid().optional(),
    candidateQuery: z.string().trim().min(2).max(120).optional(),
    jobQuery: z.string().trim().min(2).max(120).optional(),
  })
  .refine((value) => Boolean(value.applicationId || value.candidateQuery), {
    message: 'Provide applicationId or candidateQuery.',
  });

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

function buildCompanyTokenAndFilter(tokens: string[]) {
  if (!tokens.length) return null;
  return {
    AND: tokens.map((token) => ({
      OR: [
        { name: { contains: token, mode: 'insensitive' as const } },
        { domain: { contains: token, mode: 'insensitive' as const } },
      ],
    })),
  };
}

function isGlobalHrm8(actor: AssistantActor): boolean {
  return actor.actorType === 'HRM8_USER' && actor.role === 'GLOBAL_ADMIN';
}

function getRegionScope(actor: AssistantActor): string[] | null {
  if (actor.actorType !== 'HRM8_USER') return null;
  if (isGlobalHrm8(actor)) return null;
  return actor.assignedRegionIds ?? [];
}

function ensureNonEmptyRegionScope(actor: AssistantActor): string[] {
  const scope = getRegionScope(actor);
  if (scope === null) return [];
  if (!scope.length) {
    throw new Error('Your account does not have any assigned regions for this query.');
  }
  return scope;
}

const getJobStatusTool: AssistantTool = {
  name: 'get_job_status',
  description: 'Get current status, assignment, and hiring KPIs for a specific job.',
  parameters: getJobStatusArgs,
  run: async (input, actor) => {
    const { jobQuery } = getJobStatusArgs.parse(input);
    const searchTokens = extractSearchTokens(jobQuery);
    const companyTokenAndFilter = buildCompanyTokenAndFilter(searchTokens);

    const baseScope: any = {};
    if (actor.actorType === 'COMPANY_USER') {
      baseScope.company_id = actor.companyId;
    } else {
      const regionScope = getRegionScope(actor);
      if (regionScope !== null) {
        ensureNonEmptyRegionScope(actor);
        baseScope.region_id = { in: regionScope };
      }
    }

    const where: any = {
      ...baseScope,
      OR: [
        { id: jobQuery },
        { job_code: { equals: jobQuery, mode: 'insensitive' } },
        { title: { contains: jobQuery, mode: 'insensitive' } },
        { company: { is: { name: { contains: jobQuery, mode: 'insensitive' } } } },
        { company: { is: { domain: { contains: jobQuery, mode: 'insensitive' } } } },
        ...(searchTokens.length
          ? [
              {
                AND: searchTokens.map((token) => ({
                  OR: [
                    { title: { contains: token, mode: 'insensitive' } },
                    { company: { is: { name: { contains: token, mode: 'insensitive' } } } },
                    { company: { is: { domain: { contains: token, mode: 'insensitive' } } } },
                    { job_code: { contains: token, mode: 'insensitive' } },
                  ],
                })),
              },
            ]
          : []),
      ],
    };

    const job = await prisma.job.findFirst({
      where,
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
        applications: {
          select: { status: true },
        },
        company: {
          select: { id: true, name: true, domain: true },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    if (!job) {
      const matchingCompanies = await prisma.company.findMany({
        where: {
          ...(actor.actorType === 'COMPANY_USER' ? { id: actor.companyId } : {}),
          OR: [
            { id: jobQuery },
            { name: { contains: jobQuery, mode: 'insensitive' } },
            { domain: { contains: jobQuery, mode: 'insensitive' } },
            ...(companyTokenAndFilter ? [companyTokenAndFilter] : []),
          ],
        },
        select: { id: true, name: true, domain: true },
        take: 5,
      });

      if (matchingCompanies.length) {
        const companyIds = matchingCompanies.map((company) => company.id);
        const [recentJobs, jobsTotal, applicationsTotal] = await Promise.all([
          prisma.job.findMany({
            where: {
              ...baseScope,
              company_id: { in: companyIds },
            },
            select: {
              id: true,
              job_code: true,
              title: true,
              status: true,
              company_id: true,
              close_date: true,
              updated_at: true,
              posted_at: true,
              company: { select: { name: true, domain: true } },
              _count: { select: { applications: true } },
            },
            orderBy: [{ posted_at: 'desc' }, { updated_at: 'desc' }],
            take: 10,
          }),
          prisma.job.count({
            where: {
              ...baseScope,
              company_id: { in: companyIds },
            },
          }),
          prisma.application.count({
            where: {
              job: {
                is: {
                  company_id: { in: companyIds },
                  ...(baseScope.region_id ? { region_id: baseScope.region_id } : {}),
                },
              },
            },
          }),
        ]);

        return {
          found: recentJobs.length > 0,
          query: jobQuery,
          reason:
            recentJobs.length > 0
              ? 'Matched company query; returning recent jobs.'
              : 'Company matched but no jobs found in your current scope.',
          matchedCompanies: matchingCompanies,
          totals: {
            companies: matchingCompanies.length,
            jobs: jobsTotal,
            applications: applicationsTotal,
          },
          recentJobs: recentJobs.map((item) => ({
            id: item.id,
            jobCode: item.job_code,
            title: item.title,
            status: item.status,
            companyId: item.company_id,
            companyName: item.company?.name,
            companyDomain: item.company?.domain,
            applicantsCount: item._count.applications,
            closeDate: item.close_date,
            postedAt: item.posted_at,
            updatedAt: item.updated_at,
          })),
        };
      }

      return { found: false, reason: 'No matching job or company found in your data scope.' };
    }

    const hiredCount = job.applications.filter((a) => a.status === 'HIRED').length;

    return {
      found: true,
      query: jobQuery,
      job: {
        id: job.id,
        jobCode: job.job_code,
        title: job.title,
        status: job.status,
        companyName: job.company?.name,
        companyDomain: job.company?.domain,
        companyId: job.company_id,
        regionId: job.region_id,
        location: job.location,
        department: job.department,
        assignmentMode: job.assignment_mode,
        assignedConsultantId: job.assigned_consultant_id,
        applicantsCount: job._count.applications,
        hiredCount,
        vacancies: job.number_of_vacancies,
        closeDate: job.close_date,
        updatedAt: job.updated_at,
      },
    };
  },
};

const getCandidateStatusTool: AssistantTool = {
  name: 'get_candidate_status',
  description: 'Get candidate profile status plus latest application stage and status.',
  parameters: getCandidateStatusArgs,
  run: async (input, actor) => {
    const { candidateQuery, jobQuery } = getCandidateStatusArgs.parse(input);

    const candidateWhere: any = {
      OR: [
        { id: candidateQuery },
        { email: { equals: candidateQuery, mode: 'insensitive' } },
        {
          AND: candidateQuery.includes(' ')
            ? candidateQuery
                .split(' ')
                .slice(0, 2)
                .map((part) => ({
                  OR: [
                    { first_name: { contains: part, mode: 'insensitive' } },
                    { last_name: { contains: part, mode: 'insensitive' } },
                  ],
                }))
            : [
                {
                  OR: [
                    { first_name: { contains: candidateQuery, mode: 'insensitive' } },
                    { last_name: { contains: candidateQuery, mode: 'insensitive' } },
                  ],
                },
              ],
        },
      ],
    };

    const applicationsWhere: any = {};

    if (jobQuery) {
      const jobFilters: any = {
        OR: [
          { id: jobQuery },
          { job_code: { equals: jobQuery, mode: 'insensitive' } },
          { title: { contains: jobQuery, mode: 'insensitive' } },
        ],
      };

      applicationsWhere.job = { is: jobFilters };
    }

    if (actor.actorType === 'COMPANY_USER') {
      const existingJobFilters = applicationsWhere.job?.is || {};
      applicationsWhere.job = {
        is: {
          ...existingJobFilters,
          company_id: actor.companyId,
        },
      };
    } else {
      const regionScope = getRegionScope(actor);
      if (regionScope !== null) {
        ensureNonEmptyRegionScope(actor);
        const existingJobFilters = applicationsWhere.job?.is || {};
        applicationsWhere.job = {
          is: {
            ...existingJobFilters,
            region_id: { in: regionScope },
          },
        };
      }
    }

    const candidate = await prisma.candidate.findFirst({
      where: candidateWhere,
      include: {
        applications: {
          where: applicationsWhere,
          include: {
            job: {
              select: {
                id: true,
                title: true,
                job_code: true,
                company_id: true,
                region_id: true,
              },
            },
          },
          orderBy: { updated_at: 'desc' },
          take: 5,
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    if (!candidate) {
      return { found: false, reason: 'No candidate found.' };
    }

    if (actor.actorType !== 'HRM8_USER' && candidate.applications.length === 0) {
      return { found: false, reason: 'Candidate exists but is not in your company scope.' };
    }

    if (actor.actorType === 'HRM8_USER' && !isGlobalHrm8(actor) && candidate.applications.length === 0) {
      return { found: false, reason: 'Candidate exists but has no data in your assigned regions.' };
    }

    const latestApplication = candidate.applications[0];

    return {
      found: true,
      candidate: {
        id: candidate.id,
        fullName: `${candidate.first_name} ${candidate.last_name}`.trim(),
        email: candidate.email,
        status: candidate.status,
        updatedAt: candidate.updated_at,
      },
      latestApplication: latestApplication
        ? {
            id: latestApplication.id,
            jobId: latestApplication.job_id,
            jobTitle: latestApplication.job.title,
            jobCode: latestApplication.job.job_code,
            status: latestApplication.status,
            stage: latestApplication.stage,
            score: latestApplication.score,
            updatedAt: latestApplication.updated_at,
          }
        : null,
      applicationsCountInScope: candidate.applications.length,
    };
  },
};

const getJobPipelineSummaryTool: AssistantTool = {
  name: 'get_job_pipeline_summary',
  description: 'Get per-stage and per-status application counts for a job pipeline.',
  parameters: getJobPipelineSummaryArgs,
  run: async (input, actor) => {
    const { jobQuery } = getJobPipelineSummaryArgs.parse(input);

    const jobWhere: any = {
      OR: [
        { id: jobQuery },
        { job_code: { equals: jobQuery, mode: 'insensitive' } },
        { title: { contains: jobQuery, mode: 'insensitive' } },
      ],
    };

    if (actor.actorType === 'COMPANY_USER') {
      jobWhere.company_id = actor.companyId;
    } else {
      const regionScope = getRegionScope(actor);
      if (regionScope !== null) {
        ensureNonEmptyRegionScope(actor);
        jobWhere.region_id = { in: regionScope };
      }
    }

    const job = await prisma.job.findFirst({ where: jobWhere, select: { id: true, title: true, job_code: true } });

    if (!job) {
      return { found: false, reason: 'No matching job found in your data scope.' };
    }

    const [byStage, byStatus, latest] = await Promise.all([
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
        where: { job_id: job.id },
        select: {
          id: true,
          status: true,
          stage: true,
          updated_at: true,
          candidate: { select: { first_name: true, last_name: true, email: true } },
        },
        orderBy: { updated_at: 'desc' },
        take: 5,
      }),
    ]);

    return {
      found: true,
      job: {
        id: job.id,
        title: job.title,
        jobCode: job.job_code,
      },
      pipeline: {
        byStage: byStage.map((item) => ({ stage: item.stage, count: item._count._all })),
        byStatus: byStatus.map((item) => ({ status: item.status, count: item._count._all })),
        latestUpdates: latest.map((item) => ({
          applicationId: item.id,
          candidateName: `${item.candidate.first_name} ${item.candidate.last_name}`.trim(),
          candidateEmail: item.candidate.email,
          stage: item.stage,
          status: item.status,
          updatedAt: item.updated_at,
        })),
      },
    };
  },
};

const getCompanyHiringOverviewTool: AssistantTool = {
  name: 'get_company_hiring_overview',
  description: 'Summarize hiring activity, open jobs, and applications for a company.',
  parameters: getCompanyHiringOverviewArgs,
  run: async (input, actor) => {
    const { companyId, companyQuery } = getCompanyHiringOverviewArgs.parse(input);

    const regionScope = actor.actorType === 'HRM8_USER' && !isGlobalHrm8(actor) ? ensureNonEmptyRegionScope(actor) : null;

    if (actor.actorType === 'COMPANY_USER') {
      const effectiveCompanyId = actor.companyId;

      const [company, jobsTotal, applicationsTotal, jobStatusGroups, appStatusGroups, latestJobs] = await Promise.all([
        prisma.company.findUnique({
          where: { id: effectiveCompanyId },
          select: { id: true, name: true, domain: true, verification_status: true, created_at: true },
        }),
        prisma.job.count({ where: { company_id: effectiveCompanyId } }),
        prisma.application.count({ where: { job: { is: { company_id: effectiveCompanyId } } } }),
        prisma.job.groupBy({
          by: ['status'],
          where: { company_id: effectiveCompanyId },
          _count: { _all: true },
        }),
        prisma.application.groupBy({
          by: ['status'],
          where: { job: { is: { company_id: effectiveCompanyId } } },
          _count: { _all: true },
        }),
        prisma.job.findMany({
          where: { company_id: effectiveCompanyId },
          select: {
            id: true,
            title: true,
            job_code: true,
            status: true,
            posted_at: true,
            updated_at: true,
            _count: { select: { applications: true } },
          },
          orderBy: [{ posted_at: 'desc' }, { updated_at: 'desc' }],
          take: 5,
        }),
      ]);

      if (!company) {
        return { found: false, reason: 'Company not found.' };
      }

      return {
        found: true,
        scope: 'company',
        company,
        totals: {
          jobs: jobsTotal,
          applications: applicationsTotal,
        },
        jobsByStatus: jobStatusGroups.map((item) => ({ status: item.status, count: item._count._all })),
        applicationsByStatus: appStatusGroups.map((item) => ({ status: item.status, count: item._count._all })),
        latestJobs: latestJobs.map((job) => ({
          id: job.id,
          title: job.title,
          jobCode: job.job_code,
          status: job.status,
          applications: job._count.applications,
          postedAt: job.posted_at,
          updatedAt: job.updated_at,
        })),
      };
    }

    const resolvedQuery = companyId || companyQuery;

    if (!resolvedQuery) {
      const [companiesTotal, jobsTotal, applicationsTotal, jobStatusGroups, appStatusGroups] = await Promise.all([
        prisma.company.count({
          where: regionScope ? { region_id: { in: regionScope } } : {},
        }),
        prisma.job.count({
          where: regionScope ? { region_id: { in: regionScope } } : {},
        }),
        prisma.application.count({
          where: regionScope ? { job: { is: { region_id: { in: regionScope } } } } : {},
        }),
        prisma.job.groupBy({
          by: ['status'],
          where: regionScope ? { region_id: { in: regionScope } } : {},
          _count: { _all: true },
        }),
        prisma.application.groupBy({
          by: ['status'],
          where: regionScope ? { job: { is: { region_id: { in: regionScope } } } } : {},
          _count: { _all: true },
        }),
      ]);

      return {
        found: true,
        scope: 'hrm8-scoped-summary',
        totals: {
          companies: companiesTotal,
          jobs: jobsTotal,
          applications: applicationsTotal,
        },
        jobsByStatus: jobStatusGroups.map((item) => ({ status: item.status, count: item._count._all })),
        applicationsByStatus: appStatusGroups.map((item) => ({ status: item.status, count: item._count._all })),
      };
    }

    const companySearchTokens = extractSearchTokens(resolvedQuery);
    const companyTokenAndFilter = buildCompanyTokenAndFilter(companySearchTokens);

    const matchedCompanies = await prisma.company.findMany({
      where: {
        OR: [
          { id: resolvedQuery },
          { name: { contains: resolvedQuery, mode: 'insensitive' } },
          { domain: { contains: resolvedQuery, mode: 'insensitive' } },
          ...(companyTokenAndFilter ? [companyTokenAndFilter] : []),
        ],
      },
      select: { id: true, name: true, domain: true, verification_status: true, created_at: true, region_id: true },
      orderBy: { updated_at: 'desc' },
      take: 3,
    });

    const fallbackCompanyIdsFromJobs = matchedCompanies.length
      ? []
      : await prisma.job
          .findMany({
            where: {
              ...(regionScope ? { region_id: { in: regionScope } } : {}),
              company: {
                is: {
                  OR: [
                    { name: { contains: resolvedQuery, mode: 'insensitive' } },
                    { domain: { contains: resolvedQuery, mode: 'insensitive' } },
                    ...(companyTokenAndFilter ? [companyTokenAndFilter] : []),
                  ],
                },
              },
            },
            select: { company_id: true },
            distinct: ['company_id'],
            orderBy: { updated_at: 'desc' },
            take: 3,
          })
          .then((rows) => rows.map((row) => row.company_id));

    const effectiveMatchedCompanies = matchedCompanies.length
      ? matchedCompanies
      : fallbackCompanyIdsFromJobs.length
      ? await prisma.company.findMany({
          where: { id: { in: fallbackCompanyIdsFromJobs } },
          select: { id: true, name: true, domain: true, verification_status: true, created_at: true, region_id: true },
          orderBy: { updated_at: 'desc' },
          take: 3,
        })
      : [];

    if (!effectiveMatchedCompanies.length) {
      return { found: false, reason: 'No company matched this query in your scope.' };
    }

    const effectiveCompanyId = effectiveMatchedCompanies[0].id;
    const [jobsTotal, applicationsTotal, jobStatusGroups, appStatusGroups, latestJobs] = await Promise.all([
      prisma.job.count({
        where: { company_id: effectiveCompanyId, ...(regionScope ? { region_id: { in: regionScope } } : {}) },
      }),
      prisma.application.count({
        where: {
          job: {
            is: {
              company_id: effectiveCompanyId,
              ...(regionScope ? { region_id: { in: regionScope } } : {}),
            },
          },
        },
      }),
      prisma.job.groupBy({
        by: ['status'],
        where: { company_id: effectiveCompanyId, ...(regionScope ? { region_id: { in: regionScope } } : {}) },
        _count: { _all: true },
      }),
      prisma.application.groupBy({
        by: ['status'],
        where: {
          job: {
            is: {
              company_id: effectiveCompanyId,
              ...(regionScope ? { region_id: { in: regionScope } } : {}),
            },
          },
        },
        _count: { _all: true },
      }),
      prisma.job.findMany({
        where: { company_id: effectiveCompanyId, ...(regionScope ? { region_id: { in: regionScope } } : {}) },
        select: {
          id: true,
          title: true,
          job_code: true,
          status: true,
          posted_at: true,
          updated_at: true,
          _count: { select: { applications: true } },
        },
        orderBy: [{ posted_at: 'desc' }, { updated_at: 'desc' }],
        take: 5,
      }),
    ]);

    return {
      found: true,
      scope: 'company',
      company: effectiveMatchedCompanies[0],
      matchedCompanies: effectiveMatchedCompanies,
      totals: {
        jobs: jobsTotal,
        applications: applicationsTotal,
      },
      jobsByStatus: jobStatusGroups.map((item) => ({ status: item.status, count: item._count._all })),
      applicationsByStatus: appStatusGroups.map((item) => ({ status: item.status, count: item._count._all })),
      latestJobs: latestJobs.map((job) => ({
        id: job.id,
        title: job.title,
        jobCode: job.job_code,
        status: job.status,
        applications: job._count.applications,
        postedAt: job.posted_at,
        updatedAt: job.updated_at,
      })),
    };
  },
};

const searchEntitiesTool: AssistantTool = {
  name: 'search_entities',
  description: 'Search jobs, candidates, companies, or applications by natural query within your allowed scope.',
  parameters: searchEntitiesArgs,
  run: async (input, actor) => {
    const { query, entityType, limit = 5 } = searchEntitiesArgs.parse(input);
    const normalized = query.trim();
    const searchTokens = extractSearchTokens(normalized);

    const allowJob = !entityType || entityType === 'job';
    const allowCandidate = !entityType || entityType === 'candidate';
    const allowCompany = !entityType || entityType === 'company';
    const allowApplication = !entityType || entityType === 'application';

    const regionScope = actor.actorType === 'HRM8_USER' && !isGlobalHrm8(actor) ? ensureNonEmptyRegionScope(actor) : null;

    const [jobs, candidates, companies, applications] = await Promise.all([
      allowJob
        ? prisma.job.findMany({
            where: {
              ...(actor.actorType === 'COMPANY_USER' ? { company_id: actor.companyId } : {}),
              ...(regionScope ? { region_id: { in: regionScope } } : {}),
              OR: [
                { id: normalized },
                { job_code: { contains: normalized, mode: 'insensitive' } },
                { title: { contains: normalized, mode: 'insensitive' } },
                { company: { is: { name: { contains: normalized, mode: 'insensitive' } } } },
                { company: { is: { domain: { contains: normalized, mode: 'insensitive' } } } },
                ...(searchTokens.length
                  ? [
                      {
                        AND: searchTokens.map((token) => ({
                          OR: [
                            { title: { contains: token, mode: 'insensitive' as const } },
                            { job_code: { contains: token, mode: 'insensitive' as const } },
                            { company: { is: { name: { contains: token, mode: 'insensitive' as const } } } },
                            { company: { is: { domain: { contains: token, mode: 'insensitive' as const } } } },
                          ],
                        })),
                      },
                    ]
                  : []),
              ],
            },
            select: {
              id: true,
              job_code: true,
              title: true,
              status: true,
              company_id: true,
              region_id: true,
              posted_at: true,
              updated_at: true,
              company: { select: { name: true, domain: true } },
            },
            take: limit,
            orderBy: [{ posted_at: 'desc' }, { updated_at: 'desc' }],
          })
        : Promise.resolve([]),
      allowCandidate
        ? prisma.candidate.findMany({
            where: {
              OR: [
                { id: normalized },
                { email: { contains: normalized, mode: 'insensitive' } },
                { first_name: { contains: normalized, mode: 'insensitive' } },
                { last_name: { contains: normalized, mode: 'insensitive' } },
              ],
              ...(actor.actorType === 'COMPANY_USER'
                ? { applications: { some: { job: { is: { company_id: actor.companyId } } } } }
                : regionScope
                ? { applications: { some: { job: { is: { region_id: { in: regionScope } } } } } }
                : {}),
            },
            select: { id: true, first_name: true, last_name: true, email: true, status: true },
            take: limit,
            orderBy: { updated_at: 'desc' },
          })
        : Promise.resolve([]),
      allowCompany
        ? prisma.company.findMany({
            where: {
              ...(actor.actorType === 'COMPANY_USER' ? { id: actor.companyId } : {}),
              ...(regionScope ? { region_id: { in: regionScope } } : {}),
              OR: [
                { id: normalized },
                { name: { contains: normalized, mode: 'insensitive' } },
                { domain: { contains: normalized, mode: 'insensitive' } },
              ],
            },
            select: { id: true, name: true, domain: true, verification_status: true, region_id: true },
            take: limit,
            orderBy: { updated_at: 'desc' },
          })
        : Promise.resolve([]),
      allowApplication
        ? prisma.application.findMany({
            where: {
              ...(actor.actorType === 'COMPANY_USER'
                ? { job: { is: { company_id: actor.companyId } } }
                : regionScope
                ? { job: { is: { region_id: { in: regionScope } } } }
                : {}),
              OR: [
                { id: normalized },
                { candidate: { email: { contains: normalized, mode: 'insensitive' } } },
                { job: { title: { contains: normalized, mode: 'insensitive' } } },
                { job: { job_code: { contains: normalized, mode: 'insensitive' } } },
              ],
            },
            include: {
              candidate: { select: { id: true, first_name: true, last_name: true, email: true } },
              job: { select: { id: true, title: true, job_code: true } },
            },
            take: limit,
            orderBy: { updated_at: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    return {
      found: jobs.length + candidates.length + companies.length + applications.length > 0,
      query: normalized,
      results: {
        jobs,
        candidates: candidates.map((candidate) => ({
          id: candidate.id,
          fullName: `${candidate.first_name} ${candidate.last_name}`.trim(),
          email: candidate.email,
          status: candidate.status,
        })),
        companies,
        applications: applications.map((application) => ({
          id: application.id,
          status: application.status,
          stage: application.stage,
          candidate: {
            id: application.candidate.id,
            fullName: `${application.candidate.first_name} ${application.candidate.last_name}`.trim(),
            email: application.candidate.email,
          },
          job: application.job,
          updatedAt: application.updated_at,
        })),
      },
    };
  },
};

const getApplicationTimelineTool: AssistantTool = {
  name: 'get_application_timeline',
  description: 'Get timeline/progress details for a specific application and its rounds.',
  parameters: getApplicationTimelineArgs,
  run: async (input, actor) => {
    const { applicationId, candidateQuery, jobQuery } = getApplicationTimelineArgs.parse(input);

    const baseWhere: any = {};
    if (actor.actorType === 'COMPANY_USER') {
      baseWhere.job = { is: { company_id: actor.companyId } };
    } else if (!isGlobalHrm8(actor)) {
      baseWhere.job = { is: { region_id: { in: ensureNonEmptyRegionScope(actor) } } };
    }

    const where: any = { ...baseWhere };

    if (applicationId) {
      where.id = applicationId;
    } else {
      where.candidate = {
        OR: [
          { id: candidateQuery },
          { email: { equals: candidateQuery, mode: 'insensitive' } },
          { first_name: { contains: candidateQuery, mode: 'insensitive' } },
          { last_name: { contains: candidateQuery, mode: 'insensitive' } },
        ],
      };

      if (jobQuery) {
        const existingJobFilters = where.job?.is || {};
        where.job = {
          is: {
            ...existingJobFilters,
            OR: [
              { id: jobQuery },
              { job_code: { equals: jobQuery, mode: 'insensitive' } },
              { title: { contains: jobQuery, mode: 'insensitive' } },
            ],
          },
        };
      }
    }

    const application = await prisma.application.findFirst({
      where,
      include: {
        candidate: { select: { id: true, first_name: true, last_name: true, email: true } },
        job: { select: { id: true, title: true, job_code: true, company_id: true, region_id: true } },
        application_round_progress: {
          include: {
            job_round: { select: { id: true, name: true, type: true, order: true } },
          },
          orderBy: { updated_at: 'asc' },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    if (!application) {
      return { found: false, reason: 'No application found in your scope.' };
    }

    return {
      found: true,
      application: {
        id: application.id,
        status: application.status,
        stage: application.stage,
        appliedDate: application.applied_date,
        updatedAt: application.updated_at,
        shortlisted: application.shortlisted,
        score: application.score,
      },
      candidate: {
        id: application.candidate.id,
        fullName: `${application.candidate.first_name} ${application.candidate.last_name}`.trim(),
        email: application.candidate.email,
      },
      job: application.job,
      roundProgress: application.application_round_progress.map((progress) => ({
        roundId: progress.job_round_id,
        roundName: progress.job_round.name,
        stageType: progress.job_round.type,
        sortOrder: progress.job_round.order,
        completed: progress.completed,
        completedAt: progress.completed_at,
        updatedAt: progress.updated_at,
      })),
    };
  },
};

export const assistantTools: AssistantTool[] = [
  getJobStatusTool,
  getCandidateStatusTool,
  getJobPipelineSummaryTool,
  getCompanyHiringOverviewTool,
  searchEntitiesTool,
  getApplicationTimelineTool,
];

export function getToolByName(name: string): AssistantTool | undefined {
  return assistantTools.find((tool) => tool.name === name);
}
