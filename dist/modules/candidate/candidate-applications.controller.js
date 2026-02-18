"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateApplicationsController = void 0;
const controller_1 = require("../../core/controller");
const prisma_1 = require("../../utils/prisma");
class CandidateApplicationsController extends controller_1.BaseController {
    constructor() {
        super(...arguments);
        this.listApplications = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const applications = await prisma_1.prisma.application.findMany({
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
                const mappedApplications = applications.map(app => ({
                    id: app.id,
                    candidateId: app.candidate_id,
                    jobId: app.job_id,
                    status: app.status,
                    stage: app.stage,
                    appliedDate: app.applied_date,
                    resumeUrl: app.resume_url,
                    coverLetterUrl: app.cover_letter_url,
                    portfolioUrl: app.portfolio_url,
                    linkedInUrl: app.linked_in_url,
                    websiteUrl: app.website_url,
                    isRead: app.is_read,
                    isNew: app.is_new,
                    tags: app.tags,
                    score: app.score,
                    rank: app.rank,
                    shortlisted: app.shortlisted,
                    createdAt: app.created_at,
                    updatedAt: app.updated_at,
                    job: app.job
                }));
                return this.sendSuccess(res, { applications: mappedApplications });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getApplicationStatus = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const appId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const application = await prisma_1.prisma.application.findFirst({
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
                const mappedApplication = {
                    id: application.id,
                    candidateId: application.candidate_id,
                    jobId: application.job_id,
                    status: application.status,
                    stage: application.stage,
                    appliedDate: application.applied_date,
                    resumeUrl: application.resume_url,
                    coverLetterUrl: application.cover_letter_url,
                    portfolioUrl: application.portfolio_url,
                    linkedInUrl: application.linked_in_url,
                    websiteUrl: application.website_url,
                    isRead: application.is_read,
                    isNew: application.is_new,
                    tags: application.tags,
                    score: application.score,
                    rank: application.rank,
                    shortlisted: application.shortlisted,
                    createdAt: application.created_at,
                    updatedAt: application.updated_at,
                    job: application.job
                };
                return this.sendSuccess(res, { application: mappedApplication });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getApplicationTracking = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const applications = await prisma_1.prisma.application.findMany({
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
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
    }
}
exports.CandidateApplicationsController = CandidateApplicationsController;
