import { prisma } from '../../utils/prisma';
import { GoogleCalendarService } from '../integration/google-calendar.service';
import { emailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationRecipientType, UniversalNotificationType } from '@prisma/client';

const notificationService = new NotificationService(new NotificationRepository());

export class InterviewService {
  
  static async autoScheduleInterview(params: {
    applicationId: string;
    jobRoundId: string;
    scheduledBy: string;
  }) {
    // 1. Load config
    const config = await prisma.interviewConfiguration.findUnique({
      where: { job_round_id: params.jobRoundId }
    });

    if (!config || !config.enabled || !config.auto_schedule) {
      throw new Error('Interview auto-scheduling is not enabled for this round');
    }

    if (!config.default_duration || config.default_duration <= 0) {
      throw new Error('Invalid default duration');
    }

    // 2. Check existing
    const existing = await prisma.videoInterview.findFirst({
      where: {
        job_round_id: params.jobRoundId,
        application_id: params.applicationId,
        status: { in: ['SCHEDULED', 'RESCHEDULED', 'IN_PROGRESS'] }
      }
    });

    if (existing) return existing;

    // 3. Load Data
    const application = await prisma.application.findUnique({
      where: { id: params.applicationId },
      include: { candidate: true, job: true }
    });

    if (!application || !application.candidate || !application.job) {
      throw new Error('Application data incomplete');
    }

    // 4. Find Slot (Simplified logic for migration)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(10, 0, 0, 0); // Default to tomorrow 10am

    // 5. Generate Link
    let meetingLink: string | null = null;
    if (config.interview_format === 'LIVE_VIDEO') {
        const end = new Date(startDate.getTime() + (config.default_duration * 60000));
        const evt = await GoogleCalendarService.createVideoInterviewEvent({
            summary: `Interview: ${application.job.title}`,
            start: startDate,
            end: end,
            attendees: [{ email: application.candidate.email }]
        });
        meetingLink = evt.meetingLink || null;
    }

    // 6. Create Interview
    const interview = await prisma.videoInterview.create({
        data: {
            application_id: params.applicationId,
            candidate_id: application.candidate_id,
            job_id: application.job_id,
            job_round_id: params.jobRoundId,
            scheduled_date: startDate,
            duration: config.default_duration,
            meeting_link: meetingLink,
            status: 'SCHEDULED',
            type: 'VIDEO', // Default
            interviewer_ids: config.assigned_interviewer_ids || [],
            is_auto_scheduled: true
        }
    });

    // 7. Update Progress
    await prisma.applicationRoundProgress.upsert({
        where: {
            application_id_job_round_id: {
                application_id: params.applicationId,
                job_round_id: params.jobRoundId
            }
        },
        create: {
            application_id: params.applicationId,
            job_round_id: params.jobRoundId,
            video_interview_id: interview.id,
            completed: false
        },
        update: {
            video_interview_id: interview.id
        }
    });

    // 8. Notifications
    await emailService.sendInterviewInvitation({
        to: application.candidate.email,
        candidateName: application.candidate.first_name,
        jobTitle: application.job.title,
        companyName: 'Company', // Fetch company name if needed
        scheduledDate: startDate,
        meetingLink: meetingLink || undefined,
        interviewType: 'Video'
    });

    await notificationService.createNotification({
        recipientType: NotificationRecipientType.CANDIDATE,
        recipientId: application.candidate_id,
        type: UniversalNotificationType.INTERVIEW_SCHEDULED,
        title: 'Interview Scheduled',
        message: `Interview for ${application.job.title} scheduled.`,
        actionUrl: `/candidate/interviews/${interview.id}`
    });

    return interview;
  }

  static async createInterview(params: {
    applicationId: string;
    jobRoundId?: string;
    scheduledDate: Date;
    duration: number;
    type: string;
    scheduledBy: string;
    meetingLink?: string;
    interviewerIds?: string[];
    notes?: string;
  }) {
    const application = await prisma.application.findUnique({
        where: { id: params.applicationId },
        include: { candidate: true, job: true }
    });
    if (!application) throw new Error('Application not found');

    // Create
    const interview = await prisma.videoInterview.create({
        data: {
            application_id: params.applicationId,
            candidate_id: application.candidate_id,
            job_id: application.job_id,
            job_round_id: params.jobRoundId,
            scheduled_date: params.scheduledDate,
            duration: params.duration,
            meeting_link: params.meetingLink,
            status: 'SCHEDULED',
            type: params.type as any,
            interviewer_ids: params.interviewerIds || [],
            notes: params.notes,
            is_auto_scheduled: false
        }
    });

    // Notify
    if (application.candidate) {
        await emailService.sendInterviewInvitation({
            to: application.candidate.email,
            candidateName: application.candidate.first_name,
            jobTitle: application.job.title,
            companyName: 'Company',
            scheduledDate: params.scheduledDate,
            meetingLink: params.meetingLink,
            interviewType: params.type
        });
    }

    return interview;
  }

  static async getJobInterviews(jobId: string) {
    return prisma.videoInterview.findMany({
        where: { job_id: jobId },
        include: { application: { include: { candidate: true } } },
        orderBy: { scheduled_date: 'asc' }
    });
  }

  static async getInterviewById(id: string) {
    return prisma.videoInterview.findUnique({
        where: { id },
        include: { application: { include: { candidate: true } }, job_round: true }
    });
  }

  static async updateStatus(id: string, status: any, notes?: string) {
    return prisma.videoInterview.update({
        where: { id },
        data: { status, notes }
    });
  }

  static async addFeedback(interviewId: string, feedback: any) {
    // Save feedback logic here (simplified)
    await prisma.interviewFeedback.create({
        data: {
            video_interview_id: interviewId,
            ...feedback
        }
    });
    // Recalculate score logic omitted for brevity, but can be added
    return prisma.videoInterview.findUnique({ where: { id: interviewId } });
  }
}
