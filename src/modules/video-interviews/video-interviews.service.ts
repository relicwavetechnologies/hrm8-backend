import { BaseService } from '../../core/service';
import { VideoInterviewRepository } from './video-interviews.repository';
import { HttpException } from '../../core/http-exception';
import {
    CreateInterviewRequest,
    UpdateInterviewRequest,
    SubmitFeedbackRequest
} from './video-interviews.types';
import { InterviewStatus, VideoInterviewType, UserRole } from '../../types';
import { emailService } from '../email/email.service';
import {
    AutoScheduleRequest,
    AutoScheduleResponse,
    FinalizeInterviewRequest,
    SendInvitationRequest,
    ProgressionStatusResponse,
    CalendarEventResponse
} from './video-interviews.types';

export class VideoInterviewService extends BaseService {
    constructor(private videoInterviewRepository: VideoInterviewRepository) {
        super();
    }

    /**
     * Schedule a new interview
     */
    async scheduleInterview(data: CreateInterviewRequest, userId: string) {
        // 1. Validate basic inputs
        const { applicationId, candidateId, jobId, scheduledDate, interviewerIds } = data;

        // In a real app, we would check if candidate/job exists here or rely on foreign keys

        // 2. Generate Meeting Link (Mock)
        const meetingLink = data.meetingLink || this.generateMeetingLink();

        // 3. Create Record
        const interview = await this.videoInterviewRepository.create({
            application_id: applicationId,
            candidate_id: candidateId,
            job_id: jobId,
            scheduled_date: new Date(scheduledDate),
            duration: data.duration || 60,
            interviewer_ids: interviewerIds, // Store as JSON compatible array
            type: data.type || VideoInterviewType.VIDEO,
            status: InterviewStatus.SCHEDULED,
            meeting_link: meetingLink,
            notes: data.notes
        } as any); // Type assertion needed for JSON field sometimes

        // 4. Send Emails (Mocking the call)
        // await emailService.sendInterviewInvitation(...)

        return interview;
    }

    /**
     * Reschedule an interview
     */
    async rescheduleInterview(id: string, data: UpdateInterviewRequest, userId: string) {
        const interview = await this.videoInterviewRepository.findById(id);
        if (!interview) {
            throw new HttpException(404, 'Interview not found');
        }

        if (interview.status === InterviewStatus.COMPLETED || interview.status === InterviewStatus.CANCELLED) {
            throw new HttpException(400, 'Cannot reschedule a completed or cancelled interview');
        }

        const updated = await this.videoInterviewRepository.update(id, {
            scheduled_date: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
            duration: data.duration,
            interviewer_ids: data.interviewerIds, // JSON
            notes: data.notes,
            rescheduled_at: new Date(),
            rescheduled_by: userId,
            rescheduled_from: interview.scheduled_date.toISOString(),
        } as any);

        return updated;
    }

    /**
     * Cancel an interview
     */
    async cancelInterview(id: string, reason: string, userId: string) {
        const interview = await this.videoInterviewRepository.findById(id);
        if (!interview) {
            throw new HttpException(404, 'Interview not found');
        }

        const updated = await this.videoInterviewRepository.update(id, {
            status: InterviewStatus.CANCELLED,
            cancellation_reason: reason,
        });

        return updated;
    }

    /**
     * Submit Feedback
     */
    async submitFeedback(id: string, data: SubmitFeedbackRequest, interviewerId: string, interviewerName: string) {
        const interview = await this.videoInterviewRepository.findById(id);
        if (!interview) {
            throw new HttpException(404, 'Interview not found');
        }

        // 1. Add feedback entry
        const feedback = await this.videoInterviewRepository.addFeedback(id, interviewerId, interviewerName, data);

        // 2. Update the main interview status to COMPLETED
        await this.videoInterviewRepository.update(id, {
            status: InterviewStatus.COMPLETED
        });

        return feedback;
    }

    async getInterview(id: string) {
        return this.videoInterviewRepository.findById(id);
    }

    async getJobInterviews(jobId: string) {
        return this.videoInterviewRepository.findAllByJob(jobId);
    }

    /**
     * Get all interviews for a company
     */
    async getCompanyInterviews(companyId: string) {
        return this.videoInterviewRepository.findAllByCompany(companyId);
    }

    /**
     * Get interviews for an application (Candidate Portal)
     */
    async getApplicationInterviews(applicationId: string) {
        return this.videoInterviewRepository.findAllByApplication(applicationId);
    }

    /**
     * Update interview status
     */
    async updateStatus(id: string, status: InterviewStatus, userId: string) {
        const interview = await this.getInterview(id);
        if (!interview) throw new HttpException(404, 'Interview not found');

        return this.videoInterviewRepository.update(id, { status });
    }

    private generateMeetingLink() {
        const roomId = Math.random().toString(36).substring(7);
        return `https://meet.jit.si/hrm8-${roomId}`;
    }

    /**
     * Auto Schedule Interviews (Mock AI)
     */
    async autoSchedule(data: AutoScheduleRequest): Promise<AutoScheduleResponse> {
        // In a real implementation, this would call an AI service that analyzes calendars
        // and suggests optimal slots for multiple candidates.

        const suggestions = data.candidates.map(candidateId => ({
            candidateId,
            suggestedSlots: [
                new Date(Date.now() + 86400000).toISOString(), // +1 day
                new Date(Date.now() + 172800000).toISOString() // +2 days
            ],
            score: Math.floor(Math.random() * 20) + 80 // Random score 80-100
        }));

        return { suggestions };
    }

    /**
     * Finalize Interviews
     */
    async finalizeInterviews(data: FinalizeInterviewRequest, userId: string) {
        const results = [];
        for (const id of data.interviewIds) {
            try {
                const updated = await this.videoInterviewRepository.update(id, {
                    status: InterviewStatus.SCHEDULED,
                    // notes: 'Finalized via bulk action'
                });

                if (data.confirmNotifications) {
                    // await emailService.sendConfirmation(...)
                }
                results.push({ id, success: true });
            } catch (error) {
                results.push({ id, success: false, error: 'Failed to update' });
            }
        }
        return results;
    }

    /**
     * Send Invitation
     */
    async sendInvitation(id: string, data: SendInvitationRequest, userId: string) {
        const interview = await this.getInterview(id);
        if (!interview) throw new HttpException(404, 'Interview not found');

        // Mock sending invitation
        // await emailService.sendInvitation(interview, data.method);

        return { success: true, message: `Invitation sent via ${data.method}` };
    }

    /**
     * Get Progression Status
     */
    async getProgressionStatus(id: string): Promise<ProgressionStatusResponse> {
        const interview = await this.getInterview(id);
        if (!interview) throw new HttpException(404, 'Interview not found');

        // Mock progression logic
        return {
            interviewId: id,
            currentStage: 'Video Interview',
            completedStages: ['Application Screen', 'Phone Screen'],
            nextStage: 'On-site Interview',
            isBlocked: false
        };
    }

    /**
     * Get Calendar Events
     */
    async getCalendarEvents(jobId: string): Promise<CalendarEventResponse[]> {
        const interviews = await this.videoInterviewRepository.findAllByJob(jobId);

        return interviews.map(interview => ({
            id: interview.id,
            title: `Interview with Candidate ${interview.candidate_id.substring(0, 4)}`, // Ideally join candidate name
            start: interview.scheduled_date,
            end: new Date(interview.scheduled_date.getTime() + (interview.duration || 60) * 60000),
            interviewId: interview.id,
            candidateName: 'Candidate Name', // Placeholder, repo needs include
            interviewerNames: ['Interviewer 1'], // Placeholder
            status: interview.status as InterviewStatus
        }));
    }

}
