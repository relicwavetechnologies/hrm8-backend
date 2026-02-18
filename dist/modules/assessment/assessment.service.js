"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentService = void 0;
const service_1 = require("../../core/service");
const http_exception_1 = require("../../core/http-exception");
const email_service_1 = require("../email/email.service");
const env_1 = require("../../config/env");
class AssessmentService extends service_1.BaseService {
    constructor(assessmentRepository) {
        super();
        this.assessmentRepository = assessmentRepository;
    }
    async getAssessment(id) {
        const assessment = await this.assessmentRepository.findById(id);
        if (!assessment)
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        return assessment;
    }
    async getAssessmentByToken(token) {
        const assessment = await this.assessmentRepository.findByInvitationToken(token);
        if (!assessment)
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        // Check if expired
        if (assessment.expiry_date && new Date() > assessment.expiry_date) {
            throw new http_exception_1.HttpException(410, 'Assessment expired');
        }
        // Fetch questions
        let questions = await this.assessmentRepository.getQuestions(assessment.id);
        // Self-healing: If no questions found OR questions are malformed (empty text), try to sync from config
        // This handles cases where config was added after invitation, copy failed, or previous self-heal failed due to property mismatch
        const hasMalformedQuestions = questions.length > 0 && questions.some(q => !q.question_text || q.question_text.trim() === '' || q.question_text === 'Question text missing');
        if ((questions.length === 0 || hasMalformedQuestions) && (assessment.status === 'INVITED' || assessment.status === 'PENDING_INVITATION' || assessment.status === 'IN_PROGRESS')) {
            if (assessment.job_round_id) {
                const config = await this.assessmentRepository.findConfigByJobRoundId(assessment.job_round_id);
                if (config && config.questions && Array.isArray(config.questions) && config.questions.length > 0) {
                    // If we have malformed questions, delete them first to avoid duplicates
                    if (hasMalformedQuestions) {
                        await this.assessmentRepository.deleteQuestions(assessment.id);
                    }
                    const questionData = config.questions.map((q, index) => ({
                        assessment_id: assessment.id,
                        question_text: q.text || q.question_text || q.question || q.title || 'Question text missing',
                        question_type: q.type || q.question_type || 'single-choice',
                        options: q.options || null,
                        points: q.points || 1,
                        order: q.order !== undefined ? q.order : index
                    }));
                    await this.assessmentRepository.createManyQuestions(questionData);
                    questions = await this.assessmentRepository.getQuestions(assessment.id);
                }
            }
        }
        return { ...assessment, questions };
    }
    async startAssessment(token) {
        const assessment = await this.assessmentRepository.findByInvitationToken(token);
        if (!assessment)
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        if (assessment.status === 'INVITED' || assessment.status === 'PENDING_INVITATION') {
            return this.assessmentRepository.update(assessment.id, {
                status: 'IN_PROGRESS',
                started_at: new Date(),
            });
        }
        return assessment;
    }
    async saveResponse(token, questionId, response) {
        const assessment = await this.assessmentRepository.findByInvitationToken(token);
        if (!assessment)
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        if (assessment.status === 'COMPLETED' || assessment.status === 'EXPIRED') {
            throw new http_exception_1.HttpException(400, 'Assessment is already submitted or expired');
        }
        return this.assessmentRepository.upsertResponse(assessment.id, questionId, assessment.candidate_id, response);
    }
    async submitAssessment(token, responses) {
        const assessment = await this.assessmentRepository.findByInvitationToken(token);
        if (!assessment)
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        // Save final responses (if any provided in body, though we prefer auto-save)
        if (responses && responses.length > 0) {
            for (const r of responses) {
                await this.assessmentRepository.upsertResponse(assessment.id, r.questionId, assessment.candidate_id, r.response);
            }
        }
        // Update status
        return this.assessmentRepository.update(assessment.id, {
            status: 'COMPLETED',
            completed_at: new Date(),
        });
    }
    async autoAssignAssessment(applicationId, jobRoundId, invitedBy) {
        // Check if assessment already exists
        const existingAssessment = await this.assessmentRepository.findByApplicationAndRound(applicationId, jobRoundId);
        if (existingAssessment)
            return;
        // Get configuration
        const config = await this.assessmentRepository.findConfigByJobRoundId(jobRoundId);
        if (!config || !config.enabled)
            return;
        // Get application details
        const application = await this.assessmentRepository.findApplicationForAssignment(applicationId);
        if (!application)
            throw new Error('Application not found');
        // Calculate expiry
        let expiryDate;
        if (config.deadline_days) {
            expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + config.deadline_days);
        }
        // Create assessment
        const assessment = await this.assessmentRepository.create({
            user: { connect: { id: invitedBy } },
            application: { connect: { id: applicationId } },
            candidate_id: application.candidate_id,
            job_id: application.job_id,
            job_round_id: jobRoundId,
            assessment_type: 'SKILLS_BASED',
            provider: config.provider || 'native',
            invited_at: new Date(),
            expiry_date: expiryDate,
            pass_threshold: config.pass_threshold || undefined,
            status: 'INVITED',
            invitation_token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        });
        // Link to progress
        await this.assessmentRepository.linkToRoundProgress(applicationId, jobRoundId, assessment.id);
        // Create questions from config
        if (config.questions && Array.isArray(config.questions)) {
            const questionData = config.questions.map((q, index) => ({
                assessment_id: assessment.id,
                question_text: q.text || q.question_text || '',
                question_type: q.type || q.question_type || 'single-choice',
                options: q.options || null,
                points: q.points || 1,
                order: q.order !== undefined ? q.order : index
            }));
            await this.assessmentRepository.createManyQuestions(questionData);
        }
        // Send email: use round's custom template if configured, else default
        try {
            const candidateName = `${application.candidate.first_name} ${application.candidate.last_name}`;
            const jobTitle = application.job.title;
            const assessmentUrl = `${env_1.env.FRONTEND_URL}/assessment/${assessment.invitation_token}`;
            const round = await this.assessmentRepository.findJobRoundWithEmailConfig(jobRoundId);
            const emailConfig = round?.email_config;
            if (emailConfig?.enabled && emailConfig?.templateId) {
                await email_service_1.emailService.sendTemplateEmail({
                    to: application.candidate.email,
                    templateId: emailConfig.templateId,
                    contextIds: {
                        candidateId: application.candidate_id,
                        jobId: application.job_id
                    },
                    variables: {
                        assessmentUrl,
                        assessment_url: assessmentUrl,
                        candidateName,
                        jobTitle,
                        expiryDate: expiryDate?.toLocaleString?.() ?? undefined
                    }
                });
            }
            else {
                await email_service_1.emailService.sendAssessmentInvitation({
                    to: application.candidate.email,
                    candidateName,
                    jobTitle,
                    assessmentUrl,
                    expiryDate
                });
            }
        }
        catch (error) {
            console.error(`[AssessmentService] Failed to send email to ${application.candidate.email}`, error);
            // We don't fail the assignment if email fails, but we should log it
        }
    }
    // Manual invite - works without requiring assessment config to be enabled
    async manualInviteToAssessment(applicationId, jobRoundId, invitedBy) {
        // Check if assessment already exists
        const existingAssessment = await this.assessmentRepository.findByApplicationAndRound(applicationId, jobRoundId);
        if (existingAssessment) {
            return { success: false, error: 'Assessment already exists for this candidate in this round' };
        }
        // Get application details
        const application = await this.assessmentRepository.findApplicationForAssignment(applicationId);
        if (!application) {
            return { success: false, error: 'Application not found' };
        }
        // Get config if available (for settings like pass_threshold, deadline)
        const config = await this.assessmentRepository.findConfigByJobRoundId(jobRoundId);
        // Calculate expiry (7 days default if no config)
        let expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (config?.deadline_days || 7));
        // Create assessment
        const assessment = await this.assessmentRepository.create({
            user: { connect: { id: invitedBy } },
            application: { connect: { id: applicationId } },
            candidate_id: application.candidate_id,
            job_id: application.job_id,
            job_round_id: jobRoundId,
            assessment_type: 'SKILLS_BASED',
            provider: config?.provider || 'native',
            invited_at: new Date(),
            expiry_date: expiryDate,
            pass_threshold: config?.pass_threshold || 70,
            status: 'INVITED',
            invitation_token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        });
        // Link to progress
        await this.assessmentRepository.linkToRoundProgress(applicationId, jobRoundId, assessment.id);
        // Create questions from config
        if (config?.questions && Array.isArray(config.questions)) {
            const questionData = config.questions.map((q, index) => ({
                assessment_id: assessment.id,
                question_text: q.text || q.question_text || '',
                question_type: q.type || q.question_type || 'single-choice',
                options: q.options || null,
                points: q.points || 1,
                order: q.order !== undefined ? q.order : index
            }));
            await this.assessmentRepository.createManyQuestions(questionData);
        }
        // Send email
        try {
            const candidateName = `${application.candidate.first_name} ${application.candidate.last_name}`;
            const jobTitle = application.job.title;
            const assessmentUrl = `${env_1.env.FRONTEND_URL}/assessment/${assessment.invitation_token}`;
            await email_service_1.emailService.sendAssessmentInvitation({
                to: application.candidate.email,
                candidateName,
                jobTitle,
                assessmentUrl,
                expiryDate
            });
        }
        catch (error) {
            console.error(`[AssessmentService] Failed to send email to ${application.candidate.email}`, error);
        }
        return { success: true, assessmentId: assessment.id };
    }
    async createQuestions(assessmentId, questions) {
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            await this.assessmentRepository.createQuestion({
                assessment: { connect: { id: assessmentId } },
                question_text: question.questionText || question.text || '',
                question_type: (question.type || question.questionType || 'MULTIPLE_CHOICE'),
                options: question.options || null,
                correct_answer: question.correctAnswer || question.correct_answer || null,
                points: question.points || 1,
                order: question.order ?? i,
            });
        }
    }
    async getRoundAssessments(roundId) {
        const currentRound = await this.assessmentRepository.findJobRound(roundId);
        if (!currentRound)
            throw new Error('Round not found');
        const assessments = await this.assessmentRepository.findByRoundIdWithDetails(roundId);
        // Map assessments and filter out moved candidates
        const mappedAssessments = assessments.map(a => {
            const app = a.application;
            const name = app?.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : '';
            const email = app?.candidate?.email || '';
            // Check if candidate has moved to a later round
            const hasLaterRound = app?.application_round_progress?.some((p) => p.job_round && p.job_round.order > currentRound.order) || false;
            let averageScore = null;
            if (a.assessment_response && a.assessment_response.length > 0) {
                const grades = a.assessment_response
                    .flatMap((r) => r.assessment_grade || [])
                    .filter((g) => g.score !== null && g.score !== undefined);
                if (grades.length > 0) {
                    const sum = grades.reduce((acc, curr) => acc + curr.score, 0);
                    averageScore = Number((sum / grades.length).toFixed(2));
                }
            }
            // Determine if assessment is finalized (has score and all grading complete)
            const isFinalized = a.status === 'COMPLETED' && averageScore !== null;
            return {
                id: a.id,
                applicationId: a.application_id,
                candidateName: name,
                candidateEmail: email,
                status: a.status,
                score: a.results?.score || null,
                averageScore,
                invitedAt: a.invited_at,
                completedAt: a.completed_at,
                invitationToken: a.invitation_token,
                isMovedToNextRound: hasLaterRound,
                isFinalized,
                applicationStage: app?.stage
            };
        });
        // Return all assessments - frontend decides what to show based on current application stage
        return mappedAssessments;
    }
    async getGradingDetails(assessmentId) {
        const assessment = await this.assessmentRepository.getGradingData(assessmentId);
        if (!assessment)
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        let config = null;
        if (assessment.job_round_id) {
            config = await this.assessmentRepository.findConfigByJobRoundId(assessment.job_round_id);
        }
        return { ...assessment, assessmentConfig: config };
    }
    async saveGrade(assessmentId, grades, graderId) {
        const assessment = await this.assessmentRepository.getGradingData(assessmentId);
        if (!assessment)
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        for (const g of grades) {
            const response = assessment.assessment_response.find(r => r.question_id === g.questionId);
            if (response) {
                await this.assessmentRepository.upsertGrade(response.id, graderId, g.score ?? 0, g.feedback ?? '');
            }
        }
        return { message: 'Grades saved' };
    }
    async saveVote(assessmentId, vote, comment, userId) {
        const assessment = await this.assessmentRepository.findById(assessmentId);
        if (!assessment)
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        await this.assessmentRepository.upsertAssessmentVote(assessmentId, userId, vote, comment);
        return { message: 'Vote saved' };
    }
    async addComment(assessmentId, comment, userId) {
        const assessment = await this.assessmentRepository.findById(assessmentId);
        if (!assessment)
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        return this.assessmentRepository.addComment(assessmentId, userId, comment);
    }
    async finalizeAssessment(assessmentId) {
        const assessment = await this.assessmentRepository.getGradingData(assessmentId);
        if (!assessment)
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        const config = assessment.job_round_id
            ? await this.assessmentRepository.findConfigByJobRoundId(assessment.job_round_id)
            : null;
        const evaluationMode = config?.evaluation_mode || 'GRADING';
        let passed = false;
        if (evaluationMode === 'VOTING') {
            const votes = assessment.assessment_vote || [];
            const approves = votes.filter((v) => v.vote === 'APPROVE').length;
            const rejects = votes.filter((v) => v.vote === 'REJECT').length;
            const votingRule = config?.voting_rule || 'MAJORITY';
            const minApprovals = config?.min_approvals_count ?? 1;
            if (votingRule === 'UNANIMOUS') {
                passed = votes.length > 0 && rejects === 0;
            }
            else if (votingRule === 'MAJORITY') {
                passed = approves > rejects;
            }
            else if (votingRule === 'MIN_APPROVALS') {
                passed = approves >= minApprovals;
            }
            else {
                passed = approves > rejects;
            }
            await this.assessmentRepository.update(assessment.id, {
                status: 'COMPLETED',
                completed_at: assessment.completed_at || new Date(),
                results: { passed, voteCount: votes.length, approves, rejects }
            });
        }
        else {
            // Grading: Calculate Average Score
            let averageScore = 0;
            if (assessment.assessment_response && assessment.assessment_response.length > 0) {
                const grades = assessment.assessment_response
                    .flatMap((r) => r.assessment_grade || [])
                    .filter((g) => g.score !== null && g.score !== undefined);
                if (grades.length > 0) {
                    const sum = grades.reduce((acc, curr) => acc + curr.score, 0);
                    averageScore = Number((sum / grades.length).toFixed(2));
                }
            }
            const passThreshold = config?.pass_threshold || 70;
            passed = averageScore >= passThreshold;
            await this.assessmentRepository.update(assessment.id, {
                status: 'COMPLETED',
                completed_at: assessment.completed_at || new Date(),
                results: { score: averageScore, passed }
            });
        }
        // Automation Logic
        if (assessment.job_round_id && config) {
            if (config.auto_reject_on_fail && !passed) {
                await this.assessmentRepository.rejectApplication(assessment.application_id);
            }
            else if (config.auto_move_on_pass && passed) {
                await this.assessmentRepository.moveToNextRound(assessment.application_id, assessment.job_round_id);
            }
        }
        return { success: true, passed };
    }
    async resendInvitation(assessmentId) {
        const assessment = await this.assessmentRepository.findWithCandidateDetails(assessmentId);
        if (!assessment)
            throw new http_exception_1.HttpException(404, 'Assessment not found');
        // Reset invited_at
        await this.assessmentRepository.update(assessment.id, {
            invited_at: new Date()
        });
        if (assessment.application) {
            try {
                const candidateName = `${assessment.application.candidate.first_name} ${assessment.application.candidate.last_name}`;
                const jobTitle = assessment.application.job.title;
                const assessmentUrl = `${env_1.env.FRONTEND_URL}/assessment/${assessment.invitation_token}`;
                await email_service_1.emailService.sendAssessmentInvitation({
                    to: assessment.application.candidate.email,
                    candidateName,
                    jobTitle,
                    assessmentUrl,
                    expiryDate: assessment.expiry_date || undefined
                });
            }
            catch (error) {
                console.error(`[AssessmentService] Failed to resend email to ${assessment.application.candidate.email}`, error);
            }
        }
        return { message: 'Invitation resent' };
    }
}
exports.AssessmentService = AssessmentService;
