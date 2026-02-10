import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { AssistantActor } from './assistant.types';

export interface AssistantTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  run: (args: Record<string, unknown>, actor: AssistantActor) => Promise<unknown>;
}

const textQuerySchema = z.string().trim().min(2).max(120);

const getJobStatusArgs = z.object({
  jobQuery: textQuerySchema.describe('Job ID, job code, or a recognizable part of the job title'),
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
});

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
  parameters: {
    type: 'object',
    properties: {
      jobQuery: {
        type: 'string',
        description: 'Job ID, job code, or a recognizable part of the job title',
      },
    },
    required: ['jobQuery'],
    additionalProperties: false,
  },
  run: async (input, actor) => {
    const { jobQuery } = getJobStatusArgs.parse(input);

    const where: any = {
      OR: [
        { id: jobQuery },
        { job_code: { equals: jobQuery, mode: 'insensitive' } },
        { title: { contains: jobQuery, mode: 'insensitive' } },
      ],
    };

    if (actor.actorType === 'COMPANY_USER') {
      where.company_id = actor.companyId;
    } else {
      const regionScope = getRegionScope(actor);
      if (regionScope !== null) {
        ensureNonEmptyRegionScope(actor);
        where.region_id = { in: regionScope };
      }
    }

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
      },
      orderBy: { updated_at: 'desc' },
    });

    if (!job) {
      return { found: false, reason: 'No matching job found in your data scope.' };
    }

    const hiredCount = job.applications.filter((a) => a.status === 'HIRED').length;

    return {
      found: true,
      job: {
        id: job.id,
        jobCode: job.job_code,
        title: job.title,
        status: job.status,
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
  parameters: {
    type: 'object',
    properties: {
      candidateQuery: {
        type: 'string',
        description: 'Candidate ID, email, or full name',
      },
      jobQuery: {
        type: 'string',
        description: 'Optional job ID/job code/title to narrow application context',
      },
    },
    required: ['candidateQuery'],
    additionalProperties: false,
  },
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
      applicationsWhere.job = {
        OR: [
          { id: jobQuery },
          { job_code: { equals: jobQuery, mode: 'insensitive' } },
          { title: { contains: jobQuery, mode: 'insensitive' } },
        ],
      };
    }

    if (actor.actorType === 'COMPANY_USER') {
      applicationsWhere.job = {
        ...(applicationsWhere.job || {}),
        company_id: actor.companyId,
      };
    } else {
      const regionScope = getRegionScope(actor);
      if (regionScope !== null) {
        ensureNonEmptyRegionScope(actor);
        applicationsWhere.job = {
          ...(applicationsWhere.job || {}),
          region_id: { in: regionScope },
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
  parameters: {
    type: 'object',
    properties: {
      jobQuery: {
        type: 'string',
        description: 'Job ID, job code, or job title',
      },
    },
    required: ['jobQuery'],
    additionalProperties: false,
  },
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
  parameters: {
    type: 'object',
    properties: {
      companyId: {
        type: 'string',
        format: 'uuid',
        description: 'Optional company UUID. Only HRM8 global admin can query arbitrary company IDs.',
      },
    },
    additionalProperties: false,
  },
  run: async (input, actor) => {
    const { companyId } = getCompanyHiringOverviewArgs.parse(input);

    let effectiveCompanyId: string;

    if (actor.actorType === 'COMPANY_USER') {
      effectiveCompanyId = actor.companyId;
    } else if (isGlobalHrm8(actor) && companyId) {
      effectiveCompanyId = companyId;
    } else if (isGlobalHrm8(actor) && !companyId) {
      throw new Error('Global admin must provide companyId for company overview.');
    } else {
      throw new Error('This tool is not available for regional licensee scope without a company context.');
    }

    const [company, jobStatusGroups, appStatusGroups, latestJobs] = await Promise.all([
      prisma.company.findUnique({
        where: { id: effectiveCompanyId },
        select: { id: true, name: true, domain: true, verification_status: true, created_at: true },
      }),
      prisma.job.groupBy({
        by: ['status'],
        where: { company_id: effectiveCompanyId },
        _count: { _all: true },
      }),
      prisma.application.groupBy({
        by: ['status'],
        where: { job: { company_id: effectiveCompanyId } },
        _count: { _all: true },
      }),
      prisma.job.findMany({
        where: { company_id: effectiveCompanyId },
        select: {
          id: true,
          title: true,
          job_code: true,
          status: true,
          updated_at: true,
          _count: { select: { applications: true } },
        },
        orderBy: { updated_at: 'desc' },
        take: 5,
      }),
    ]);

    if (!company) {
      return { found: false, reason: 'Company not found.' };
    }

    return {
      found: true,
      company,
      jobsByStatus: jobStatusGroups.map((item) => ({ status: item.status, count: item._count._all })),
      applicationsByStatus: appStatusGroups.map((item) => ({ status: item.status, count: item._count._all })),
      latestJobs: latestJobs.map((job) => ({
        id: job.id,
        title: job.title,
        jobCode: job.job_code,
        status: job.status,
        applications: job._count.applications,
        updatedAt: job.updated_at,
      })),
    };
  },
};

export const assistantTools: AssistantTool[] = [
  getJobStatusTool,
  getCandidateStatusTool,
  getJobPipelineSummaryTool,
  getCompanyHiringOverviewTool,
];

export function getToolByName(name: string): AssistantTool | undefined {
  return assistantTools.find((tool) => tool.name === name);
}
