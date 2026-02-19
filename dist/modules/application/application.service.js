"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationService = void 0;
const service_1 = require("../../core/service");
const client_1 = require("@prisma/client");
const candidate_scoring_service_1 = require("../ai/candidate-scoring.service");
const http_exception_1 = require("../../core/http-exception");
const prisma_1 = require("../../utils/prisma");
const email_service_1 = require("../email/email.service");
const interview_service_1 = require("../interview/interview.service");
class ApplicationService extends service_1.BaseService {
    constructor(applicationRepository, candidateRepository, notificationService) {
        super();
        this.applicationRepository = applicationRepository;
        this.candidateRepository = candidateRepository;
        this.notificationService = notificationService;
    }
    async submitApplication(data) {
        // Check if candidate has already applied
        const hasApplied = await this.applicationRepository.checkExistingApplication(data.candidateId, data.jobId);
        if (hasApplied) {
            throw new http_exception_1.HttpException(400, 'You have already applied to this job');
        }
        // Create the application
        const application = await this.applicationRepository.create({
            candidate: { connect: { id: data.candidateId } },
            job: { connect: { id: data.jobId } },
            status: 'NEW',
            stage: 'NEW_APPLICATION',
            applied_date: new Date(),
            resume_url: data.resumeUrl,
            cover_letter_url: data.coverLetterUrl,
            portfolio_url: data.portfolioUrl,
            linked_in_url: data.linkedInUrl,
            website_url: data.websiteUrl,
            custom_answers: data.customAnswers || [],
            questionnaire_data: data.questionnaireData,
            is_read: false,
            is_new: true,
            tags: [],
            shortlisted: false,
            manually_added: false,
        });
        // Trigger AI Scoring asynchronously
        candidate_scoring_service_1.CandidateScoringService.scoreCandidate({
            applicationId: application.id,
            jobId: data.jobId
        }).catch((err) => {
            console.error('Failed to trigger AI analysis:', err);
        });
        // Handle Auto-Email for NEW round
        // Non-blocking catch-all to prevent application failure if email fails
        (async () => {
            try {
                const newRound = await prisma_1.prisma.jobRound.findFirst({
                    where: {
                        job_id: data.jobId,
                        is_fixed: true,
                        fixed_key: 'NEW'
                    }
                });
                if (newRound?.email_config) {
                    const config = newRound.email_config;
                    if (config.enabled && config.templateId) {
                        // Fetch candidate to get email if not in request
                        // Ideally we use the application's candidate relation but we just created it. 
                        // We have data.candidateId.
                        const candidate = await this.candidateRepository.findById(data.candidateId);
                        // Fetch job to get companyId
                        const job = await prisma_1.prisma.job.findUnique({
                            where: { id: data.jobId },
                            select: { company_id: true }
                        });
                        if (candidate && candidate.email && job?.company_id) {
                            await email_service_1.emailService.sendTemplateEmail({
                                to: candidate.email,
                                templateId: config.templateId,
                                contextIds: {
                                    candidateId: candidate.id,
                                    jobId: data.jobId,
                                    companyId: job.company_id
                                }
                            });
                            console.log(`[Auto-Email] Sent 'New Application' email to ${candidate.email}`);
                        }
                    }
                }
            }
            catch (err) {
                console.error('[Auto-Email] Failed to process auto-email for new application:', err);
            }
        })();
        return application;
    }
    async getApplication(id) {
        const app = await this.applicationRepository.findById(id);
        if (!app) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        return this.mapApplication(app);
    }
    async getCandidateApplications(candidateId) {
        const applications = await this.applicationRepository.findByCandidateId(candidateId);
        return applications.map(app => this.mapApplication(app));
    }
    async getJobApplications(jobId, filters) {
        let applications = await this.applicationRepository.findByJobId(jobId, filters);
        if (applications.length === 0) {
            const jobByCode = await prisma_1.prisma.job.findFirst({
                where: { job_code: jobId },
                select: { id: true }
            });
            if (jobByCode?.id) {
                applications = await this.applicationRepository.findByJobId(jobByCode.id, filters);
            }
        }
        // Get the NEW round for this job (default round for new applications)
        const newRound = await prisma_1.prisma.jobRound.findFirst({
            where: {
                job_id: jobId,
                is_fixed: true,
                fixed_key: 'NEW'
            }
        });
        // Extract round progress and map applications
        const roundProgress = {};
        const mappedApplications = applications.map(app => {
            // Extract round progress
            const progress = app.application_round_progress?.[0];
            if (progress) {
                roundProgress[app.id] = {
                    roundId: progress.job_round_id,
                    stage: app.stage
                };
            }
            else if (newRound) {
                // Assign to NEW round if no progress exists
                roundProgress[app.id] = {
                    roundId: newRound.id,
                    stage: app.stage || 'SCREENING'
                };
            }
            return this.mapApplication(app);
        });
        return { applications: mappedApplications, roundProgress };
    }
    async triggerAiAnalysis(applicationId, jobId) {
        try {
            const result = await candidate_scoring_service_1.CandidateScoringService.scoreCandidate({ applicationId, jobId });
            await this.applicationRepository.saveScreeningResult({
                applicationId,
                screeningType: 'AUTOMATED',
                status: result.recommendation === 'strong_no_hire' ? 'FAILED' : 'PASSED',
                score: result.scores.overall,
                criteriaMatched: result, // Save full analysis JSON
            });
            // Update application score
            await this.applicationRepository.updateScore(applicationId, result.scores.overall);
        }
        catch (error) {
            console.error('Error in triggerAiAnalysis:', error);
            // Log but don't fail the request
        }
    }
    async bulkAiAnalysis(applicationIds, jobId) {
        let success = 0;
        let failed = 0;
        await Promise.all(applicationIds.map(async (id) => {
            try {
                await this.triggerAiAnalysis(id, jobId);
                success++;
            }
            catch (error) {
                console.error(`Failed to analyze application ${id}`, error);
                failed++;
            }
        }));
        return { success, failed };
    }
    mapApplication(app) {
        console.log(`[mapApplication] Mapping application: ${app.id}`);
        // Find AI screening result (AUTOMATED) or fallback to first result
        const aiResult = Array.isArray(app.screening_result)
            ? app.screening_result.find((r) => r.screening_type === 'AUTOMATED')
            : app.screening_result;
        // Use criteria_matched from new result, or fallback to legacy app.ai_analysis
        const analysisData = aiResult?.criteria_matched || app.ai_analysis || {};
        const hasAnalysis = !!aiResult || !!app.ai_analysis;
        const aiAnalysis = hasAnalysis ? {
            summary: analysisData.summary || aiResult?.summary, // Support both new execution JSON and potential legacy fields
            detailedAnalysis: analysisData.detailedAnalysis || analysisData.detailed_analysis,
            behavioralTraits: analysisData.behavioralTraits || analysisData.behavioral_traits,
            concerns: analysisData.concerns,
            strengths: analysisData.strengths,
            careerTrajectory: analysisData.careerTrajectory || analysisData.career_trajectory,
            flightRisk: analysisData.flightRisk || analysisData.flight_risk,
            culturalFit: analysisData.culturalFit || analysisData.cultural_fit,
            salaryBenchmark: analysisData.salaryBenchmark || analysisData.salary_benchmark,
            technicalAssessment: analysisData.technicalAssessment || analysisData.technical_assessment,
        } : null;
        // Map candidate data to parsedResume format
        const parsedResume = app.candidate ? {
            skills: app.candidate.skills?.map((s) => ({
                name: s.name,
                proficiency: s.level || 'Intermediate' // Default to intermediate if missing
            })) || [],
            workHistory: app.candidate.work_experience?.map((w) => ({
                company: w.company,
                role: w.role,
                startDate: w.start_date,
                endDate: w.end_date,
                description: w.description
            })) || [],
            education: app.candidate.education?.map((e) => ({
                institution: e.institution,
                degree: e.degree,
                field: e.field,
                startDate: e.start_date,
                endDate: e.end_date
            })) || []
        } : null;
        return {
            ...app,
            recruiterNotes: app.recruiter_notes,
            // Map screening_result to aiAnalysis property expected by frontend
            aiAnalysis,
            // Map candidate details to parsedResume property expected by frontend
            parsedResume,
        };
    }
    async updateScore(id, score) {
        const application = await this.getApplication(id);
        if (!application) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        return this.applicationRepository.updateScore(id, score);
    }
    async updateRank(id, rank) {
        const application = await this.getApplication(id);
        if (!application) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        return this.applicationRepository.updateRank(id, rank);
    }
    async updateTags(id, tags) {
        const application = await this.getApplication(id);
        if (!application) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        return this.applicationRepository.updateTags(id, tags);
    }
    async shortlistCandidate(id, userId) {
        const application = await this.getApplication(id);
        if (!application) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        return this.applicationRepository.shortlist(id, userId);
    }
    async unshortlistCandidate(id) {
        const application = await this.getApplication(id);
        if (!application) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        return this.applicationRepository.unshortlist(id);
    }
    async updateStage(id, stage) {
        const application = await this.getApplication(id);
        if (!application) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        const updatedApp = await this.applicationRepository.updateStage(id, stage);
        // Notify Candidate of status change
        await this.notificationService.createNotification({
            recipientType: client_1.NotificationRecipientType.CANDIDATE,
            recipientId: updatedApp.candidate_id,
            type: client_1.UniversalNotificationType.APPLICATION_STATUS_CHANGED,
            title: 'Application Update',
            message: `Your application status has been updated to ${stage.replace(/_/g, ' ')}.`,
            data: { applicationId: id, stage },
            actionUrl: `/candidate/applications/${id}`,
        });
        return updatedApp;
    }
    async updateNotes(id, notes) {
        const application = await this.getApplication(id);
        if (!application) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        return this.applicationRepository.updateNotes(id, notes);
    }
    async withdrawApplication(id, candidateId) {
        const application = await this.getApplication(id);
        if (!application) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        // Verify the application belongs to the candidate
        if (application.candidate_id !== candidateId) {
            throw new http_exception_1.HttpException(403, 'Unauthorized to withdraw this application');
        }
        return this.applicationRepository.update(id, {
            status: 'WITHDRAWN',
        });
    }
    async deleteApplication(id, candidateId) {
        const application = await this.getApplication(id);
        if (!application) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        // Verify the application belongs to the candidate
        if (application.candidate_id !== candidateId) {
            throw new http_exception_1.HttpException(403, 'Unauthorized to delete this application');
        }
        await this.applicationRepository.delete(id);
    }
    async markAsRead(id) {
        return this.applicationRepository.markAsRead(id);
    }
    async bulkScoreCandidates(applicationIds, scores) {
        return this.applicationRepository.bulkUpdateScore(applicationIds, scores);
    }
    async getApplicationCountForJob(jobId) {
        const [total, unread] = await Promise.all([
            this.applicationRepository.countByJobId(jobId),
            this.applicationRepository.countUnreadByJobId(jobId),
        ]);
        return { total, unread };
    }
    async checkApplication(candidateId, jobId) {
        return this.applicationRepository.checkExistingApplication(candidateId, jobId);
    }
    async createManualApplication(data, recruiterId) {
        // 1. Check or Create Candidate
        let candidate = await this.candidateRepository.findByEmail(data.email);
        if (!candidate) {
            candidate = await this.candidateRepository.create({
                email: data.email,
                first_name: data.firstName,
                last_name: data.lastName,
                password_hash: '', // No password for manually added
                status: 'ACTIVE',
                resume_url: data.resumeUrl, // Sync profile URL
                resumes: data.resumeUrl ? {
                    create: {
                        file_url: data.resumeUrl,
                        file_name: 'Resume.pdf', // Default
                        file_size: 0,
                        file_type: 'application/pdf',
                        content: '', // content not available yet
                        is_default: true
                    }
                } : undefined
            });
        }
        else {
            // If candidate exists, add resume if provided
            if (data.resumeUrl) {
                // We need to add resume. Repository doesn't expose addResume directly but UPDATE works with nested create
                await this.candidateRepository.update(candidate.id, {
                    resumes: {
                        create: {
                            file_url: data.resumeUrl,
                            file_name: 'Resume.pdf',
                            file_size: 0,
                            file_type: 'application/pdf',
                            is_default: false
                        }
                    }
                });
            }
        }
        // 2. Create Application
        const existingApp = await this.applicationRepository.checkExistingApplication(candidate.id, data.jobId);
        if (existingApp) {
            throw new http_exception_1.HttpException(400, 'Candidate already applied to this job');
        }
        const app = await this.applicationRepository.create({
            candidate: { connect: { id: candidate.id } },
            job: { connect: { id: data.jobId } },
            status: 'NEW',
            stage: 'NEW_APPLICATION',
            manually_added: true,
            added_by: recruiterId,
            added_at: new Date(),
            resume_url: data.resumeUrl,
            source: 'MANUAL',
            recruiter_notes: data.notes,
            tags: data.tags || []
        });
        return app;
    }
    async updateManualScreening(id, data) {
        return this.applicationRepository.update(id, {
            manual_screening_status: data.status,
            manual_screening_score: data.score,
            screening_notes: data.notes,
            manual_screening_date: data.date || new Date(),
            manual_screening_completed: true
        });
    }
    async createFromTalentPool(candidateId, jobId, recruiterId) {
        const hasApplied = await this.applicationRepository.checkExistingApplication(candidateId, jobId);
        if (hasApplied) {
            throw new http_exception_1.HttpException(400, 'Candidate already applied');
        }
        const candidate = await this.candidateRepository.findById(candidateId);
        if (!candidate)
            throw new http_exception_1.HttpException(404, 'Candidate not found');
        return this.applicationRepository.create({
            candidate: { connect: { id: candidateId } },
            job: { connect: { id: jobId } },
            status: 'NEW',
            stage: 'NEW_APPLICATION',
            manually_added: true,
            added_by: recruiterId,
            source: 'TALENT_POOL',
            resume_url: candidate.resume_url // Copy resume from candidate profile if exists
        });
    }
    async getResume(id) {
        const app = await this.applicationRepository.findById(id);
        if (!app) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        if (!app.resume_url) {
            throw new http_exception_1.HttpException(404, 'Resume not found');
        }
        console.log('[getResume] Application ID:', id);
        console.log('[getResume] Application resume_url:', app.resume_url);
        // Try to find the detailed resume record to get content
        let resumeRecord = await this.applicationRepository.findResumeByUrl(app.resume_url);
        console.log('[getResume] Found resumeRecord by URL match:', !!resumeRecord);
        let parsedContent = resumeRecord?.content || null;
        console.log('[getResume] Existing content in resumeRecord:', parsedContent ? `${parsedContent.substring(0, 50)}...` : 'null');
        if (resumeRecord && !parsedContent) {
            // Content missing in DB, trigger parsing (Self-Healing)
            try {
                console.log(`[getResume] Parsing missing content for resume: ${resumeRecord.id}`);
                const { DocumentParser } = await Promise.resolve().then(() => __importStar(require('../../utils/document-parser')));
                parsedContent = await DocumentParser.parseFromUrl(resumeRecord.file_url);
                console.log('[getResume] Parsed content length:', parsedContent?.length || 0);
                if (parsedContent) {
                    await this.applicationRepository.updateResumeContent(resumeRecord.id, parsedContent);
                    console.log('[getResume] Updated resume content in DB');
                }
            }
            catch (e) {
                console.error('[getResume] Failed to parse resume on fly', e);
            }
        }
        else if (!resumeRecord) {
            // No record found, try parsing from URL directly to return content
            console.log('[getResume] No resumeRecord found, parsing directly from app.resume_url');
            try {
                const { DocumentParser } = await Promise.resolve().then(() => __importStar(require('../../utils/document-parser')));
                parsedContent = await DocumentParser.parseFromUrl(app.resume_url);
                console.log('[getResume] Parsed content length from app URL:', parsedContent?.length || 0);
            }
            catch (e) {
                console.error('[getResume] Failed to parse resume on fly from app url', e);
            }
        }
        if (resumeRecord) {
            return {
                id: resumeRecord.id,
                candidateId: resumeRecord.candidate_id,
                fileName: resumeRecord.file_name,
                fileUrl: resumeRecord.file_url,
                fileSize: resumeRecord.file_size,
                fileType: resumeRecord.file_type,
                uploadedAt: resumeRecord.uploaded_at,
                content: parsedContent, // Use the potentially newly parsed content
                isDefault: resumeRecord.is_default
            };
        }
        // Fallback if no detailed record
        return {
            id: app.id,
            candidateId: app.candidate_id,
            fileName: 'Resume.pdf',
            fileUrl: app.resume_url,
            fileSize: 0,
            fileType: 'application/pdf',
            uploadedAt: app.created_at,
            uploadedBy: app.candidate_id,
            content: parsedContent
        };
    }
    async moveToRound(applicationId, jobRoundId, userId) {
        // Verify application exists
        const application = await this.getApplication(applicationId);
        if (!application) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        // Handle fallback round IDs (e.g., "fixed-OFFER-{jobId}")
        let actualRoundId = jobRoundId;
        // We need to access JobRoundService/Repository to resolve rounds.
        // For now assuming we cannot inject it due to circular deps, we access prisma via repository if needed,
        // OR we instantiate a repository here. Best practice is to have it injected.
        // I'll assume we can't easily inject it right now without refactoring constructor, 
        // so I'll rely on a helper in ApplicationRepository OR add the dependency if safe.
        // Let's rely on ApplicationRepository helper methods to interact with JobRounds which is not ideal but safe.
        // Ideally: new JobRoundRepository() or injected.
        // NOTE: For this "Restoration" I will use a helper in ApplicationRepository to find round by ID or Fixed Key
        const round = await this.applicationRepository.findJobRound(actualRoundId);
        let targetRound = round;
        if (!targetRound && actualRoundId.startsWith('fixed-')) {
            const parts = actualRoundId.split('-');
            if (parts.length >= 2) {
                const fixedKey = parts[1]; // e.g., "OFFER"
                // Try find by fixed key
                targetRound = await this.applicationRepository.findJobRoundByFixedKey(application.job_id, fixedKey);
                // If still not found, we might need to initialize (this checks logic from old backend)
                // For now, assuming fixed rounds are likely present.
                if (targetRound) {
                    actualRoundId = targetRound.id;
                }
            }
        }
        if (!targetRound) {
            throw new http_exception_1.HttpException(404, 'Round not found');
        }
        if (targetRound.job_id !== application.job_id) {
            throw new http_exception_1.HttpException(403, 'Round does not belong to the same job');
        }
        // Upsert Progress
        await this.applicationRepository.upsertRoundProgress(applicationId, actualRoundId);
        // Map Round to Stage
        let mappedStage = 'NEW_APPLICATION';
        if (targetRound.is_fixed && targetRound.fixed_key) {
            const key = targetRound.fixed_key;
            if (key === 'NEW')
                mappedStage = 'NEW_APPLICATION';
            else if (key === 'OFFER')
                mappedStage = 'OFFER_EXTENDED';
            else if (key === 'HIRED')
                mappedStage = 'OFFER_ACCEPTED';
            else if (key === 'REJECTED')
                mappedStage = 'REJECTED';
        }
        else {
            if (targetRound.type === 'ASSESSMENT')
                mappedStage = 'RESUME_REVIEW';
            else if (targetRound.type === 'INTERVIEW')
                mappedStage = 'TECHNICAL_INTERVIEW';
        }
        // Update Application Stage
        const updatedApp = await this.applicationRepository.updateStage(applicationId, mappedStage);
        // Auto-assign Assessment
        if (targetRound.type === 'ASSESSMENT') {
            // Need to dynamic import or use a service locator to avoid circular dependency if possible
            const { AssessmentService } = await Promise.resolve().then(() => __importStar(require('../assessment/assessment.service')));
            const { AssessmentRepository } = await Promise.resolve().then(() => __importStar(require('../assessment/assessment.repository'))); // Import repo to instantiate service
            // Instantiate manually if not in container (NestJS style vs manual) - The codebase seems manual dependency injection or simple classes.
            // Looking at structure, simple classes.
            const assessmentService = new AssessmentService(new AssessmentRepository());
            try {
                await assessmentService.autoAssignAssessment(applicationId, actualRoundId, userId);
            }
            catch (e) {
                console.error('Failed to auto-assign assessment', e);
            }
        }
        // Auto-schedule Interview
        else if (targetRound.type === 'INTERVIEW') {
            const { InterviewService } = await Promise.resolve().then(() => __importStar(require('../interview/interview.service')));
            try {
                await InterviewService.autoScheduleInterview({
                    applicationId,
                    jobRoundId: actualRoundId,
                    scheduledBy: userId
                });
            }
            catch (e) {
                console.error('Failed to auto-schedule interview', e);
            }
        }
        // Send round's configured email for non-assessment rounds (assessment uses autoAssignAssessment)
        const emailConfig = targetRound.email_config;
        if (targetRound.type !== 'ASSESSMENT' && emailConfig?.enabled && emailConfig?.templateId) {
            const candidateEmail = application.candidate?.email;
            if (candidateEmail) {
                (async () => {
                    try {
                        await email_service_1.emailService.sendTemplateEmail({
                            to: candidateEmail,
                            templateId: emailConfig.templateId,
                            contextIds: {
                                candidateId: application.candidate_id,
                                jobId: application.job_id
                            }
                        });
                        console.log(`[Round-Email] Sent round entry email to ${candidateEmail}`);
                    }
                    catch (err) {
                        console.error('[Round-Email] Failed to send round entry email', err);
                    }
                })();
            }
        }
        // Auto-send offer when moving to OFFER round (from round offer_config)
        const offerConfig = targetRound.offer_config;
        if (targetRound.is_fixed && targetRound.fixed_key === 'OFFER' && offerConfig?.autoSend) {
            (async () => {
                try {
                    const { OfferService } = await Promise.resolve().then(() => __importStar(require('../offer/offer.service')));
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + (parseInt(offerConfig.defaultExpiryDays || '7', 10) || 7));
                    const startDate = new Date();
                    startDate.setDate(startDate.getDate() + 30);
                    const benefits = offerConfig.defaultBenefits
                        ? (typeof offerConfig.defaultBenefits === 'string'
                            ? offerConfig.defaultBenefits.split(',').map((b) => b.trim())
                            : [])
                        : [];
                    const offer = await OfferService.createOffer({
                        applicationId,
                        offerType: 'full-time',
                        salary: parseFloat(offerConfig.defaultSalary || '0') || 0,
                        salaryCurrency: offerConfig.defaultSalaryCurrency || 'USD',
                        salaryPeriod: offerConfig.defaultSalaryPeriod || 'annual',
                        startDate: startDate.toISOString().split('T')[0],
                        workLocation: offerConfig.defaultWorkLocation || '',
                        workArrangement: offerConfig.defaultWorkArrangement || 'remote',
                        benefits,
                        vacationDays: offerConfig.defaultVacationDays ? parseInt(offerConfig.defaultVacationDays, 10) : undefined,
                        customMessage: offerConfig.defaultCustomMessage || undefined,
                        expiryDate: expiryDate.toISOString().split('T')[0],
                        templateId: offerConfig.defaultTemplateId || undefined,
                    }, userId);
                    await OfferService.sendOffer(offer.id);
                    console.log(`[Offer-AutoSend] Offer created and sent for application ${applicationId}`);
                }
                catch (err) {
                    console.error('[Offer-AutoSend] Failed to auto-send offer:', err);
                }
            })();
        }
        return updatedApp;
    }
    async addEvaluation(data) {
        const evaluation = await this.applicationRepository.addEvaluation(data);
        // If decision provided, handle application status update
        // Only 'APPROVE' or 'REJECT' should trigger status changes AND only if user has permission (handled in Controller/Middleware)
        // Assuming Permission Check is done before calling this service or within the controller.
        // Note: The prompt implies: "if shortlisting type user or admin approve or reject candidate it will be marked as shortlisted and rejected"
        // We'll handle the status update logic in the controller to keep service focused, OR here if we pass user role.
        // For now, simpler to return evaluation and let controller decide on status update based on role.
        return evaluation;
    }
    async getEvaluations(applicationId) {
        return this.applicationRepository.getEvaluations(applicationId);
    }
    // Get notes for an application
    async getNotes(applicationId) {
        const app = await this.applicationRepository.findById(applicationId);
        if (!app) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        // Notes are stored as JSON in recruiter_notes field
        let notes = [];
        try {
            if (app.recruiter_notes) {
                const parsed = typeof app.recruiter_notes === 'string'
                    ? JSON.parse(app.recruiter_notes)
                    : app.recruiter_notes;
                notes = Array.isArray(parsed) ? parsed : [];
            }
        }
        catch {
            notes = [];
        }
        return notes;
    }
    // Add a note with @mention support
    async addNote(applicationId, userId, content, mentions = []) {
        const app = await this.applicationRepository.findById(applicationId);
        if (!app) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        // Get existing notes
        let notes = [];
        try {
            if (app.recruiter_notes) {
                const parsed = typeof app.recruiter_notes === 'string'
                    ? JSON.parse(app.recruiter_notes)
                    : app.recruiter_notes;
                notes = Array.isArray(parsed) ? parsed : [];
            }
        }
        catch {
            notes = [];
        }
        // Get user info for the note
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true }
        });
        // Create new note
        const newNote = {
            id: crypto.randomUUID(),
            content,
            mentions,
            createdAt: new Date().toISOString(),
            author: {
                id: userId,
                name: user?.name || 'Unknown',
                email: user?.email || ''
            }
        };
        notes.push(newNote);
        // Save updated notes
        await this.applicationRepository.updateNotes(applicationId, JSON.stringify(notes));
        // Send notifications to mentioned users
        if (mentions.length > 0) {
            await this.sendMentionNotifications(applicationId, userId, content, mentions);
        }
        return newNote;
    }
    // Send notifications to mentioned users
    async sendMentionNotifications(applicationId, authorId, content, mentionedUserIds) {
        try {
            const author = await prisma_1.prisma.user.findUnique({
                where: { id: authorId },
                select: { name: true }
            });
            const app = await this.applicationRepository.findById(applicationId);
            if (!app)
                return;
            const candidate = app.candidate;
            const candidateName = candidate
                ? `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'a candidate'
                : 'a candidate';
            for (const userId of mentionedUserIds) {
                // Create in-app notification
                await this.notificationService.createNotification({
                    recipientType: client_1.NotificationRecipientType.USER,
                    recipientId: userId,
                    type: client_1.UniversalNotificationType.NEW_MESSAGE,
                    title: 'You were mentioned in a note',
                    message: `${author?.name || 'Someone'} mentioned you in a note on ${candidateName}'s application.`,
                    data: { applicationId, content: content.substring(0, 200) },
                    actionUrl: `/ats/applications/${applicationId}`,
                });
                // Send email notification
                const mentionedUser = await prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    select: { email: true, name: true }
                });
                if (mentionedUser?.email) {
                    await email_service_1.emailService.sendNotificationEmail(mentionedUser.email, `${author?.name || 'Someone'} mentioned you in a note`, `${author?.name || 'A team member'} mentioned you in a note on ${candidateName}'s application: "${content.substring(0, 200)}${content.length > 200 ? '...' : ''}"`, `/ats/applications/${applicationId}`);
                }
            }
        }
        catch (error) {
            console.error('[sendMentionNotifications] Error sending notifications:', error);
        }
    }
    // Schedule an interview for an application
    async scheduleInterview(params) {
        const application = await this.applicationRepository.findById(params.applicationId);
        if (!application) {
            throw new http_exception_1.HttpException(404, 'Application not found');
        }
        const interview = await interview_service_1.InterviewService.createInterview({
            applicationId: params.applicationId,
            scheduledBy: params.scheduledBy,
            scheduledDate: params.scheduledDate,
            duration: params.duration,
            type: params.type,
            interviewerIds: params.interviewerIds,
            notes: params.notes,
        });
        // Send email notifications to interviewers for IN_PERSON and PANEL types
        if (['IN_PERSON', 'PANEL'].includes(params.type) && params.interviewerIds?.length) {
            try {
                const appData = await prisma_1.prisma.application.findUnique({
                    where: { id: params.applicationId },
                    include: { candidate: true, job: { include: { company: true } } }
                });
                if (appData) {
                    const candidateName = appData.candidate
                        ? `${appData.candidate.first_name} ${appData.candidate.last_name}`.trim()
                        : 'Candidate';
                    const jobTitle = appData.job?.title || 'Position';
                    const companyName = appData.job?.company?.name || 'Company';
                    for (const interviewerId of params.interviewerIds) {
                        const interviewer = await prisma_1.prisma.user.findUnique({
                            where: { id: interviewerId },
                            select: { email: true, name: true }
                        });
                        if (interviewer?.email) {
                            await email_service_1.emailService.sendNotificationEmail(interviewer.email, `Interview Scheduled: ${jobTitle}`, `<p>Hi ${interviewer.name},</p>
                <p>You have been assigned as an interviewer for <strong>${candidateName}</strong> applying for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
                <p><strong>Date:</strong> ${params.scheduledDate.toLocaleString()}</p>
                <p><strong>Duration:</strong> ${params.duration} minutes</p>
                <p><strong>Type:</strong> ${params.type.replace('_', ' ')}</p>`);
                        }
                    }
                }
            }
            catch (err) {
                console.error('[scheduleInterview] Failed to send interviewer emails:', err);
            }
        }
        return interview;
    }
    // Get interviews for an application
    async getInterviews(applicationId) {
        const interviews = await prisma_1.prisma.videoInterview.findMany({
            where: { application_id: applicationId },
            orderBy: { scheduled_date: 'desc' },
            include: {
                job_round: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                interview_notes: {
                    orderBy: { created_at: 'desc' },
                },
            },
        });
        return interviews;
    }
    // Update an interview
    async updateInterview(interviewId, updates) {
        const interview = await prisma_1.prisma.videoInterview.update({
            where: { id: interviewId },
            data: {
                ...updates,
                updated_at: new Date(),
            },
        });
        return interview;
    }
    // Cancel an interview
    async cancelInterview(interviewId, cancellationReason) {
        const interview = await prisma_1.prisma.videoInterview.update({
            where: { id: interviewId },
            data: {
                status: 'CANCELLED',
                cancellation_reason: cancellationReason,
                updated_at: new Date(),
            },
        });
        return interview;
    }
    // Add a note to an interview
    async addInterviewNote(interviewId, authorId, authorName, content) {
        const interview = await prisma_1.prisma.videoInterview.findUnique({ where: { id: interviewId } });
        if (!interview)
            throw new http_exception_1.HttpException(404, 'Interview not found');
        const note = await prisma_1.prisma.interviewNote.create({
            data: {
                interview_id: interviewId,
                author_id: authorId,
                author_name: authorName,
                content,
            },
        });
        return note;
    }
    // Get notes for an interview
    async getInterviewNotes(interviewId) {
        return prisma_1.prisma.interviewNote.findMany({
            where: { interview_id: interviewId },
            orderBy: { created_at: 'desc' },
        });
    }
    // Delete an interview note (author only)
    async deleteInterviewNote(noteId, authorId) {
        const note = await prisma_1.prisma.interviewNote.findUnique({ where: { id: noteId } });
        if (!note)
            throw new http_exception_1.HttpException(404, 'Note not found');
        if (note.author_id !== authorId)
            throw new http_exception_1.HttpException(403, 'Forbidden: You can only delete your own notes');
        await prisma_1.prisma.interviewNote.delete({ where: { id: noteId } });
    }
}
exports.ApplicationService = ApplicationService;
