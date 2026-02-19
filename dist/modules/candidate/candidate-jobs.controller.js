"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateJobsController = void 0;
const controller_1 = require("../../core/controller");
const candidate_job_service_1 = require("./candidate-job.service");
class CandidateJobsController extends controller_1.BaseController {
    constructor() {
        super();
        this.listJobs = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const { skip = '0', take = '20' } = req.query;
                const jobs = await this.jobService.listJobs(parseInt(skip), parseInt(take));
                return this.sendSuccess(res, { jobs });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getJob = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const job = await this.jobService.getJobDetails(jobId);
                if (!job)
                    return this.sendError(res, new Error('Job not found'), 404);
                return this.sendSuccess(res, { job });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.applyJob = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const application = await this.jobService.applyToJob(req.candidate.id, jobId, req.body);
                res.status(201);
                return this.sendSuccess(res, { application });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.saveJob = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const saved = await this.jobService.saveJob(req.candidate.id, jobId);
                return this.sendSuccess(res, { saved });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.searchJobs = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const { q = '', location = '', employmentType = '', skip = '0', take = '20' } = req.query;
                const jobs = await this.jobService.searchJobs(q, location, employmentType, parseInt(skip), parseInt(take));
                return this.sendSuccess(res, { jobs });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getRecommendedJobs = async (req, res) => {
            try {
                if (!req.candidate)
                    return this.sendError(res, new Error('Not authenticated'));
                const limit = req.query.limit ? parseInt(req.query.limit) : 10;
                const recommendedJobs = await this.jobService.getRecommendedJobs(req.candidate.id, limit);
                return this.sendSuccess(res, recommendedJobs);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.jobService = new candidate_job_service_1.CandidateJobService();
    }
}
exports.CandidateJobsController = CandidateJobsController;
