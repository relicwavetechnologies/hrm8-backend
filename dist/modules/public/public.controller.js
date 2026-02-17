"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicController = void 0;
const controller_1 = require("../../core/controller");
const public_service_1 = require("./public.service");
const job_repository_1 = require("../job/job.repository");
const company_repository_1 = require("../company/company.repository");
class PublicController extends controller_1.BaseController {
    constructor() {
        super();
        this.getJobs = async (req, res) => {
            try {
                const { search, page, limit } = req.query;
                const pageNum = parseInt(page) || 1;
                const limitNum = parseInt(limit) || 20;
                const offset = (pageNum - 1) * limitNum;
                const result = await this.publicService.getPublicJobs({
                    search,
                    limit: limitNum,
                    offset
                });
                return this.sendSuccess(res, {
                    jobs: result.jobs,
                    pagination: {
                        total: result.total,
                        page: pageNum,
                        limit: limitNum,
                        pages: Math.ceil(result.total / limitNum)
                    }
                });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getJobDetails = async (req, res) => {
            try {
                const { id } = req.params;
                const job = await this.publicService.getPublicJob(id);
                if (!job) {
                    return this.sendError(res, new Error('Job not found or no longer available'));
                }
                return this.sendSuccess(res, { job });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getFilters = async (req, res) => {
            try {
                const filters = await this.publicService.getFilters();
                return this.sendSuccess(res, { data: filters });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getAggregations = async (req, res) => {
            try {
                const aggregations = await this.publicService.getAggregations();
                return this.sendSuccess(res, { data: aggregations });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.getRelatedJobs = async (req, res) => {
            try {
                const id = req.params.id;
                const limit = parseInt(req.query.limit) || 5;
                const result = await this.publicService.getRelatedJobs(id, limit);
                return this.sendSuccess(res, { data: result });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.trackJobView = async (req, res) => {
            try {
                const id = req.params.id;
                await this.publicService.trackJobView(id, {
                    ...req.body,
                    ip: req.ip,
                    userAgent: req.get('user-agent')
                });
                return this.sendSuccess(res, { success: true });
            }
            catch (error) {
                // Don't fail the request if tracking fails
                return this.sendSuccess(res, { success: false });
            }
        };
        this.getApplicationForm = async (req, res) => {
            try {
                const { jobId } = req.params;
                const form = await this.publicService.getApplicationForm(jobId);
                if (!form) {
                    return this.sendError(res, new Error('Job not found or no longer available'));
                }
                return this.sendSuccess(res, { form });
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        this.submitGuestApplication = async (req, res) => {
            try {
                const result = await this.publicService.submitGuestApplication(req.body);
                return this.sendSuccess(res, result);
            }
            catch (error) {
                return this.sendError(res, error);
            }
        };
        // In a real app, use dependency injection container
        this.publicService = new public_service_1.PublicService(new job_repository_1.JobRepository(), new company_repository_1.CompanyRepository());
    }
}
exports.PublicController = PublicController;
