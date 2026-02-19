"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobRoundRepository = void 0;
const repository_1 = require("../../core/repository");
class JobRoundRepository extends repository_1.BaseRepository {
    async findByJobId(jobId) {
        return this.prisma.jobRound.findMany({
            where: { job_id: jobId },
            orderBy: { order: 'asc' },
        });
    }
    async findById(id) {
        return this.prisma.jobRound.findUnique({
            where: { id },
        });
    }
    async create(data) {
        return this.prisma.jobRound.create({
            data,
        });
    }
    async update(id, data) {
        return this.prisma.jobRound.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        return this.prisma.jobRound.delete({
            where: { id },
        });
    }
    async countByJobId(jobId) {
        return this.prisma.jobRound.count({
            where: { job_id: jobId },
        });
    }
    async findByJobIdAndFixedKey(jobId, fixedKey) {
        return this.prisma.jobRound.findFirst({
            where: {
                job_id: jobId,
                fixed_key: fixedKey,
            },
        });
    }
    // Interview Configuration Methods
    async getInterviewConfig(roundId) {
        return this.prisma.interviewConfiguration.findUnique({
            where: { job_round_id: roundId },
        });
    }
    async upsertInterviewConfig(roundId, data) {
        const assignedIds = Array.isArray(data.assignedInterviewerIds) ? data.assignedInterviewerIds : (Array.isArray(data.assigned_interviewer_ids) ? data.assigned_interviewer_ids : []);
        return this.prisma.interviewConfiguration.upsert({
            where: { job_round_id: roundId },
            create: {
                job_round_id: roundId,
                enabled: data.enabled ?? false,
                auto_schedule: data.autoSchedule ?? true,
                require_before_progression: data.requireBeforeProgression ?? false,
                require_all_interviewers: data.requireAllInterviewers ?? false,
                interview_format: data.interviewFormat || 'LIVE_VIDEO',
                default_duration: data.defaultDuration || 60,
                requires_interviewer: data.requiresInterviewer ?? true,
                auto_schedule_window_days: data.autoScheduleWindowDays,
                available_time_slots: data.availableTimeSlots,
                buffer_time_minutes: data.bufferTimeMinutes,
                calendar_integration: data.calendarIntegration,
                auto_reschedule_on_no_show: data.autoRescheduleOnNoShow ?? false,
                auto_reschedule_on_cancel: data.autoRescheduleOnCancel ?? false,
                use_custom_criteria: data.useCustomCriteria ?? false,
                rating_criteria: data.ratingCriteria,
                pass_threshold: data.passThreshold,
                scoring_method: data.scoringMethod,
                auto_move_on_pass: data.autoMoveOnPass ?? false,
                pass_criteria: data.passCriteria,
                next_round_on_pass_id: data.nextRoundOnPassId,
                auto_reject_on_fail: data.autoRejectOnFail ?? false,
                fail_criteria: data.failCriteria,
                reject_round_id: data.rejectRoundId,
                requires_manual_review: data.requiresManualReview ?? true,
                template_id: data.templateId,
                questions: data.questions,
                agenda: data.agenda,
                assigned_interviewer_ids: assignedIds,
            },
            update: {
                enabled: data.enabled,
                auto_schedule: data.autoSchedule,
                require_before_progression: data.requireBeforeProgression,
                require_all_interviewers: data.requireAllInterviewers,
                interview_format: data.interviewFormat,
                default_duration: data.defaultDuration,
                requires_interviewer: data.requiresInterviewer,
                auto_schedule_window_days: data.autoScheduleWindowDays,
                available_time_slots: data.availableTimeSlots,
                buffer_time_minutes: data.bufferTimeMinutes,
                calendar_integration: data.calendarIntegration,
                auto_reschedule_on_no_show: data.autoRescheduleOnNoShow,
                auto_reschedule_on_cancel: data.autoRescheduleOnCancel,
                use_custom_criteria: data.useCustomCriteria,
                rating_criteria: data.ratingCriteria,
                pass_threshold: data.passThreshold,
                scoring_method: data.scoringMethod,
                auto_move_on_pass: data.autoMoveOnPass,
                pass_criteria: data.passCriteria,
                next_round_on_pass_id: data.nextRoundOnPassId,
                auto_reject_on_fail: data.autoRejectOnFail,
                fail_criteria: data.failCriteria,
                reject_round_id: data.rejectRoundId,
                requires_manual_review: data.requiresManualReview,
                template_id: data.templateId,
                questions: data.questions,
                agenda: data.agenda,
                assigned_interviewer_ids: assignedIds,
            },
        });
    }
    // Assessment Configuration Methods
    async getAssessmentConfig(roundId) {
        return this.prisma.assessmentConfiguration.findUnique({
            where: { job_round_id: roundId },
        });
    }
    async upsertAssessmentConfig(roundId, data) {
        return this.prisma.assessmentConfiguration.upsert({
            where: { job_round_id: roundId },
            create: {
                job_round_id: roundId,
                enabled: data.enabled ?? false,
                auto_assign: data.autoAssign ?? true,
                deadline_days: data.deadlineDays,
                time_limit_minutes: data.timeLimitMinutes,
                pass_threshold: data.passThreshold,
                provider: data.provider || 'native',
                provider_config: data.providerConfig,
                questions: data.questions,
                instructions: data.instructions,
                auto_move_on_pass: data.auto_move_on_pass ?? data.autoMoveOnPass ?? false,
                auto_reject_on_fail: data.auto_reject_on_fail ?? data.autoRejectOnFail ?? false,
                auto_reject_on_deadline: data.auto_reject_on_deadline ?? data.autoRejectOnDeadline ?? false,
                evaluation_mode: data.evaluation_mode ?? data.evaluationMode ?? 'GRADING',
                voting_rule: data.voting_rule ?? data.votingRule,
                min_approvals_count: data.min_approvals_count ?? data.minApprovalsCount,
            },
            update: {
                enabled: data.enabled,
                auto_assign: data.autoAssign,
                deadline_days: data.deadlineDays,
                time_limit_minutes: data.timeLimitMinutes,
                pass_threshold: data.passThreshold,
                provider: data.provider,
                provider_config: data.providerConfig,
                questions: data.questions,
                instructions: data.instructions,
                auto_move_on_pass: data.auto_move_on_pass ?? data.autoMoveOnPass,
                auto_reject_on_fail: data.auto_reject_on_fail ?? data.autoRejectOnFail,
                auto_reject_on_deadline: data.auto_reject_on_deadline ?? data.autoRejectOnDeadline,
                evaluation_mode: data.evaluation_mode ?? data.evaluationMode,
                voting_rule: data.voting_rule ?? data.votingRule,
                min_approvals_count: data.min_approvals_count ?? data.minApprovalsCount,
            },
        });
    }
}
exports.JobRoundRepository = JobRoundRepository;
