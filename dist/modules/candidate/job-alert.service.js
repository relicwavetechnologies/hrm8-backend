"use strict";
/**
 * Job Alert Service
 * Handles processing of job alerts when jobs are published
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobAlertService = void 0;
const service_1 = require("../../core/service");
const logger_1 = require("../../utils/logger");
const prisma_1 = require("../../utils/prisma");
class JobAlertService extends service_1.BaseService {
    constructor(notificationService, emailService) {
        super();
        this.notificationService = notificationService;
        this.emailService = emailService;
        this.logger = logger_1.Logger.create('job-alert');
        this.prisma = prisma_1.prisma;
    }
    /**
     * Process job alerts for a newly published job
     * This is the main entry point called from JobService.publishJob()
     */
    async processJobAlerts(job) {
        this.logger.info(`Processing job alerts for job: ${job.id} - ${job.title}`);
        try {
            // Get all active job alerts with their candidates
            const activeAlerts = await this.getActiveJobAlerts();
            if (activeAlerts.length === 0) {
                this.logger.info('No active job alerts found');
                return;
            }
            this.logger.info(`Found ${activeAlerts.length} active job alerts`);
            // Match job against each alert
            const matchedAlerts = [];
            for (const alert of activeAlerts) {
                const matchScore = this.matchJobToAlert(job, alert);
                if (matchScore > 0) {
                    const candidate = await this.getCandidateById(alert.candidate_id);
                    if (candidate) {
                        matchedAlerts.push({ alert, candidate, matchScore });
                    }
                }
            }
            this.logger.info(`Matched ${matchedAlerts.length} candidates for job ${job.id}`);
            // Sort by match score (highest first) and limit to top 50 to prevent spam
            const topMatches = matchedAlerts
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, 50);
            // Send notifications to matched candidates
            for (const match of topMatches) {
                await this.sendAlertNotification(match.candidate, job, match.alert, match.matchScore);
            }
            this.logger.info(`Sent ${topMatches.length} job alert notifications for job ${job.id}`);
        }
        catch (error) {
            this.logger.error(`Failed to process job alerts for job ${job.id}:`, error);
            // Don't throw - job publishing should not fail due to alert processing
        }
    }
    /**
     * Get all active job alerts with candidate info
     */
    async getActiveJobAlerts() {
        return this.prisma.jobAlert.findMany({
            where: {
                is_active: true,
            },
            include: {
                candidate: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                    }
                }
            }
        });
    }
    /**
     * Get candidate by ID
     */
    async getCandidateById(candidateId) {
        return this.prisma.candidate.findUnique({
            where: { id: candidateId }
        });
    }
    /**
     * Match a job against a job alert criteria
     * Returns a match score (0 = no match, higher = better match)
     */
    matchJobToAlert(job, alert) {
        const criteria = alert.criteria || {};
        let score = 0;
        let matches = 0;
        let totalChecks = 0;
        // Check keywords (title, description, category)
        if (criteria.keywords && criteria.keywords.length > 0) {
            totalChecks++;
            const jobText = `${job.title} ${job.description} ${job.category || ''}`.toLowerCase();
            const keywordMatches = criteria.keywords.filter(kw => jobText.includes(kw.toLowerCase())).length;
            if (keywordMatches > 0) {
                matches++;
                score += keywordMatches * 10; // 10 points per keyword match
            }
        }
        // Check location
        if (criteria.location) {
            totalChecks++;
            const jobLocation = (job.location || '').toLowerCase();
            const alertLocation = criteria.location.toLowerCase();
            if (jobLocation.includes(alertLocation) || alertLocation.includes(jobLocation)) {
                matches++;
                score += 20; // 20 points for location match
            }
        }
        // Check employment type
        if (criteria.employmentType) {
            totalChecks++;
            if (job.employment_type === criteria.employmentType) {
                matches++;
                score += 15; // 15 points for employment type match
            }
        }
        // Check work arrangement
        if (criteria.workArrangement) {
            totalChecks++;
            if (job.work_arrangement === criteria.workArrangement) {
                matches++;
                score += 15; // 15 points for work arrangement match
            }
        }
        // Check category
        if (criteria.category) {
            totalChecks++;
            if (job.category === criteria.category) {
                matches++;
                score += 15; // 15 points for category match
            }
        }
        // Check department
        if (criteria.department) {
            totalChecks++;
            if (job.department === criteria.department) {
                matches++;
                score += 10; // 10 points for department match
            }
        }
        // Check salary range
        if (criteria.salaryMin !== undefined || criteria.salaryMax !== undefined) {
            totalChecks++;
            const jobSalaryMin = job.salary_min || 0;
            const jobSalaryMax = job.salary_max || jobSalaryMin;
            const alertSalaryMin = criteria.salaryMin || 0;
            const alertSalaryMax = criteria.salaryMax || Infinity;
            // Check if job salary overlaps with alert salary range
            if (jobSalaryMax >= alertSalaryMin && jobSalaryMin <= alertSalaryMax) {
                matches++;
                score += 10; // 10 points for salary range match
            }
        }
        // If no specific criteria were set, match all jobs (basic alert)
        if (totalChecks === 0) {
            return 5; // Minimum score for alerts with no criteria
        }
        // Require at least one match
        if (matches === 0) {
            return 0;
        }
        // Boost score based on percentage of criteria matched
        const matchPercentage = matches / totalChecks;
        score += Math.round(matchPercentage * 20);
        return score;
    }
    /**
     * Send job alert notification to a candidate
     */
    async sendAlertNotification(candidate, job, alert, matchScore) {
        try {
            // Get company info
            const company = await this.prisma.company.findUnique({
                where: { id: job.company_id },
                select: { name: true }
            });
            const companyName = company?.name || 'Unknown Company';
            // Send in-app notification
            await this.notificationService.createNotification({
                recipientType: 'CANDIDATE',
                recipientId: candidate.id,
                type: 'JOB_ALERT',
                title: `New Job Match: ${job.title}`,
                message: `${companyName} is hiring for ${job.title} in ${job.location}. This matches your "${alert.name}" alert.`,
                data: {
                    jobId: job.id,
                    alertId: alert.id,
                    matchScore,
                    companyId: job.company_id,
                },
                actionUrl: `/candidate/jobs/${job.id}`,
            });
            // Send email notification if email channel is enabled
            if (alert.channels?.includes('EMAIL')) {
                await this.emailService.sendJobAlertEmail({
                    to: candidate.email,
                    candidateName: `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Candidate',
                    jobTitle: job.title,
                    companyName,
                    location: job.location,
                    employmentType: job.employment_type,
                    workArrangement: job.work_arrangement,
                    salaryRange: this.formatSalaryRange(job),
                    jobDescription: this.truncateText(job.description, 300),
                    jobUrl: `${process.env.FRONTEND_URL}/candidate/jobs/${job.id}`,
                    alertName: alert.name,
                    matchScore,
                });
            }
            // Update last triggered timestamp
            await this.prisma.jobAlert.update({
                where: { id: alert.id },
                data: { updated_at: new Date() }
            });
            this.logger.info(`Sent job alert to candidate ${candidate.id} for job ${job.id}`);
        }
        catch (error) {
            this.logger.error(`Failed to send alert notification to candidate ${candidate.id}:`, error);
        }
    }
    /**
     * Format salary range for display
     */
    formatSalaryRange(job) {
        if (!job.salary_min && !job.salary_max) {
            return 'Not specified';
        }
        const currency = job.salary_currency || 'USD';
        const min = job.salary_min?.toLocaleString();
        const max = job.salary_max?.toLocaleString();
        if (min && max) {
            return `${currency} ${min} - ${max}`;
        }
        else if (min) {
            return `${currency} ${min}+`;
        }
        else if (max) {
            return `Up to ${currency} ${max}`;
        }
        return 'Not specified';
    }
    /**
     * Truncate text to specified length
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text || '';
        }
        return text.substring(0, maxLength).trim() + '...';
    }
}
exports.JobAlertService = JobAlertService;
