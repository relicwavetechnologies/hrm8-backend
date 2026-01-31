import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { CandidateAuthenticatedRequest } from '../../types';
import { prisma } from '../../utils/prisma';

export class CandidateApplicationsController extends BaseController {

  listApplications = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));

      const applications = await prisma.application.findMany({
        where: { candidate_id: req.candidate.id },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: { select: { name: true } },
              location: true
            }
          }
        },
        orderBy: { applied_date: 'desc' },
        take: 50
      });

      return this.sendSuccess(res, { applications });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getApplicationStatus = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));

      const appId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const application = await prisma.application.findFirst({
        where: {
          id: appId,
          candidate_id: req.candidate.id
        },
        include: {
          job: {
            select: {
              title: true,
              company: { select: { name: true } },
              description: true
            }
          }
        }
      });

      if (!application) {
        return this.sendError(res, new Error('Application not found'), 404);
      }

      return this.sendSuccess(res, { application });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getApplicationTracking = async (req: CandidateAuthenticatedRequest, res: Response) => {
    try {
      if (!req.candidate) return this.sendError(res, new Error('Not authenticated'));

      const applications = await prisma.application.findMany({
        where: { candidate_id: req.candidate.id },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: { select: { name: true } }
            }
          }
        },
        orderBy: { applied_date: 'desc' }
      });

      // Enrich with tracking info
      const tracking = applications.map(app => ({
        id: app.id,
        jobTitle: app.job.title,
        company: app.job.company.name,
        status: app.status,
        stage: app.stage,
        appliedDate: app.applied_date,
        updatedAt: app.updated_at,
        isNew: app.is_new,
        shortlisted: app.shortlisted,
        score: app.score
      }));

      return this.sendSuccess(res, { applications: tracking });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
