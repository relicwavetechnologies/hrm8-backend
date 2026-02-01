import type { Prisma, Candidate } from '@prisma/client';
import { BaseRepository } from '../../core/repository';

export class CandidateRepository extends BaseRepository {

  async create(data: Prisma.CandidateCreateInput): Promise<Candidate> {
    return this.prisma.candidate.create({ data });
  }

  async update(id: string, data: Prisma.CandidateUpdateInput): Promise<Candidate> {
    return this.prisma.candidate.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<Candidate | null> {
    return this.prisma.candidate.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<Candidate | null> {
    return this.prisma.candidate.findUnique({
      where: { email },
    });
  }

  async delete(id: string): Promise<Candidate> {
    return this.prisma.candidate.delete({
      where: { id },
    });
  }

  async updateLastLogin(id: string): Promise<Candidate> {
    return this.prisma.candidate.update({
      where: { id },
      data: { last_login_at: new Date() },
    });
  }

  // Session Management
  async createSession(data: Prisma.CandidateSessionCreateInput) {
    return this.prisma.candidateSession.create({
      data,
    });
  }

  async findSessionBySessionId(sessionId: string) {
    return this.prisma.candidateSession.findUnique({
      where: { session_id: sessionId },
      include: { candidate: true },
    });
  }

  async deleteSession(sessionId: string) {
    return this.prisma.candidateSession.delete({
      where: { session_id: sessionId },
    });
  }

  // Verification Token Management
  async createVerificationToken(data: Prisma.CandidateVerificationTokenCreateInput) {
    return this.prisma.candidateVerificationToken.create({ data });
  }

  async findVerificationTokenByToken(token: string) {
    return this.prisma.candidateVerificationToken.findUnique({
      where: { token },
      include: { candidate: true },
    });
  }

  async markVerificationTokenUsed(tokenId: string) {
    return this.prisma.candidateVerificationToken.update({
      where: { id: tokenId },
      data: { used_at: new Date() },
    });
  }

  async deleteExpiredVerificationTokens() {
    return this.prisma.candidateVerificationToken.deleteMany({
      where: {
        expires_at: { lt: new Date() },
      },
    });
  }

  // Assessment Methods
  async getAssessments(candidateId: string) {
    return this.prisma.assessment.findMany({
      where: {
        candidate_id: candidateId,
        status: {
          in: ['INVITED', 'IN_PROGRESS', 'COMPLETED'],
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async getAssessmentById(id: string, candidateId: string) {
    return this.prisma.assessment.findFirst({
      where: {
        id,
        candidate_id: candidateId,
      },
      include: {
        assessment_question: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            question_text: true,
            question_type: true,
            options: true,
            points: true,
            order: true,
          }
        }
      }
    });
  }

  async getAssessmentConfig(jobRoundId: string) {
    return this.prisma.assessmentConfiguration.findUnique({
      where: { job_round_id: jobRoundId }
    });
  }

  async updateAssessmentStatus(id: string, status: string, startedAt?: string) {
    const currentResults = (await this.prisma.assessment.findUnique({ where: { id } }))?.results as any || {};
    return this.prisma.assessment.update({
      where: { id },
      data: {
        status: status as any,
        results: startedAt ? { ...currentResults, startedAt } : currentResults
      }
    });
  }


  // Job and JobRound Methods (for enriching assessment data)
  async getJobRoundWithJob(jobRoundId: string) {
    return this.prisma.jobRound.findUnique({
      where: { id: jobRoundId },
      include: { job: { select: { title: true } } }
    });
  }

  async getJobTitle(jobId: string) {
    return this.prisma.job.findUnique({
      where: { id: jobId },
      select: { title: true }
    });
  }

  async submitAssessmentResponses(assessmentId: string, candidateId: string, answers: Array<{ questionId: string; response: string }>) {
    return this.prisma.$transaction(async (tx: any) => {
      for (const ans of answers) {
        const question = await tx.assessmentQuestion.findFirst({
          where: { id: ans.questionId, assessment_id: assessmentId }
        });

        if (question) {
          // Auto-grade for multiple choice
          let score = 0;
          if (question.question_type === 'MULTIPLE_CHOICE' && question.correct_answer) {
            const correct = question.correct_answer as any;
            if (String(ans.response) === String(correct)) {
              score = question.points || 0;
            }
          }

          await tx.assessmentResponse.create({
            data: {
              assessment_id: assessmentId,
              question_id: ans.questionId,
              candidate_id: candidateId,
              response: ans.response,
              score: score
            }
          });
        }
      }

      // Update assessment status
      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'COMPLETED',
          completed_at: new Date()
        }
      });
    });
  }

  // Documents Methods
  async getDocuments(candidateId: string) {
    const [resumes, coverLetters, portfolios] = await Promise.all([
      this.prisma.candidateResume.findMany({
        where: { candidate_id: candidateId },
        orderBy: [
          { is_default: 'desc' },
          { uploaded_at: 'desc' }
        ]
      }),
      this.prisma.candidateCoverLetter.findMany({
        where: { candidate_id: candidateId },
        orderBy: { created_at: 'desc' }
      }),
      this.prisma.candidatePortfolio.findMany({
        where: { candidate_id: candidateId },
        orderBy: { created_at: 'desc' }
      })
    ]);
    return { resumes, coverLetters, portfolios };
  }

  // Qualifications Methods
  async getQualifications(candidateId: string) {
    const [education, certifications, training] = await Promise.all([
      this.prisma.candidateEducation.findMany({
        where: { candidate_id: candidateId }
      }),
      this.prisma.candidateCertification.findMany({
        where: { candidate_id: candidateId }
      }),
      this.prisma.candidateTraining.findMany({
        where: { candidate_id: candidateId }
      })
    ]);
    return { education, certifications, training };
  }

  // Work History Methods
  async getWorkHistory(candidateId: string) {
    return this.prisma.candidateWorkExperience.findMany({
      where: { candidate_id: candidateId },
      orderBy: { start_date: 'desc' }
    });
  }

  // Update Documents Methods
  async updateResume(resumeId: string, candidateId: string, data: any) {
    return this.prisma.candidateResume.update({
      where: { id: resumeId },
      data: {
        is_default: data.is_default ?? undefined,
        file_name: data.file_name ?? undefined,
        file_url: data.file_url ?? undefined,
        file_size: data.file_size ?? undefined,
        file_type: data.file_type ?? undefined,
        content: data.content ?? undefined,
      },
    });
  }

  async createResume(candidateId: string, data: any) {
    return this.prisma.candidateResume.create({
      data: {
        candidate_id: candidateId,
        file_name: data.file_name,
        file_url: data.file_url,
        file_size: data.file_size,
        file_type: data.file_type,
        is_default: data.is_default ?? false,
      },
    });
  }

  async deleteResume(resumeId: string) {
    return this.prisma.candidateResume.delete({
      where: { id: resumeId },
    });
  }

  async updateResumeUrl(candidateId: string, url: string | null) {
    return this.prisma.candidate.update({
      where: { id: candidateId },
      data: { resume_url: url },
    });
  }

  async updateCoverLetter(coverId: string, data: any) {
    return this.prisma.candidateCoverLetter.update({
      where: { id: coverId },
      data: {
        title: data.title ?? undefined,
        content: data.content ?? undefined,
        file_url: data.file_url ?? undefined,
        file_name: data.file_name ?? undefined,
        file_size: data.file_size ?? undefined,
        file_type: data.file_type ?? undefined,
        is_template: data.is_template ?? undefined,
        is_draft: data.is_draft ?? undefined,
      },
    });
  }

  async createCoverLetter(candidateId: string, data: any) {
    return this.prisma.candidateCoverLetter.create({
      data: {
        candidate_id: candidateId,
        title: data.title,
        content: data.content ?? null,
        file_url: data.file_url ?? null,
        file_name: data.file_name ?? null,
        file_size: data.file_size ?? null,
        file_type: data.file_type ?? null,
        is_template: data.is_template ?? false,
        is_draft: data.is_draft ?? true,
      },
    });
  }

  async deleteCoverLetter(coverId: string) {
    return this.prisma.candidateCoverLetter.delete({
      where: { id: coverId },
    });
  }

  async updatePortfolio(portfolioId: string, data: any) {
    return this.prisma.candidatePortfolio.update({
      where: { id: portfolioId },
      data: {
        title: data.title ?? undefined,
        type: data.type ?? undefined,
        file_url: data.file_url ?? undefined,
        file_name: data.file_name ?? undefined,
        file_size: data.file_size ?? undefined,
        file_type: data.file_type ?? undefined,
        external_url: data.external_url ?? undefined,
        platform: data.platform ?? undefined,
        description: data.description ?? undefined,
      },
    });
  }

  async createPortfolio(candidateId: string, data: any) {
    return this.prisma.candidatePortfolio.create({
      data: {
        candidate_id: candidateId,
        title: data.title,
        type: data.type,
        file_url: data.file_url ?? null,
        file_name: data.file_name ?? null,
        file_size: data.file_size ?? null,
        file_type: data.file_type ?? null,
        external_url: data.external_url ?? null,
        platform: data.platform ?? null,
        description: data.description ?? null,
      },
    });
  }

  async deletePortfolio(portfolioId: string) {
    return this.prisma.candidatePortfolio.delete({
      where: { id: portfolioId },
    });
  }

  // Update Qualifications Methods
  async updateEducation(educationId: string, data: any) {
    return this.prisma.candidateEducation.update({
      where: { id: educationId },
      data: {
        institution: data.institution ?? undefined,
        degree: data.degree ?? undefined,
        field: data.field ?? undefined,
        start_date: data.start_date ? new Date(data.start_date) : undefined,
        end_date: data.end_date ? new Date(data.end_date) : undefined,
        current: data.current ?? undefined,
        grade: data.grade ?? undefined,
        description: data.description ?? undefined,
      },
    });
  }

  async createEducation(candidateId: string, data: any) {
    return this.prisma.candidateEducation.create({
      data: {
        candidate_id: candidateId,
        institution: data.institution,
        degree: data.degree,
        field: data.field,
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
        current: data.current ?? false,
        grade: data.grade ?? null,
        description: data.description ?? null,
      },
    });
  }

  async deleteEducation(educationId: string) {
    return this.prisma.candidateEducation.delete({
      where: { id: educationId },
    });
  }

  async updateCertification(certId: string, data: any) {
    return this.prisma.candidateCertification.update({
      where: { id: certId },
      data: {
        name: data.name ?? undefined,
        issuing_org: data.issuing_org ?? undefined,
        issue_date: data.issue_date ? new Date(data.issue_date) : undefined,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : undefined,
        credential_id: data.credential_id ?? undefined,
        credential_url: data.credential_url ?? undefined,
        does_not_expire: data.does_not_expire ?? undefined,
      },
    });
  }

  async createCertification(candidateId: string, data: any) {
    return this.prisma.candidateCertification.create({
      data: {
        candidate_id: candidateId,
        name: data.name,
        issuing_org: data.issuing_org,
        issue_date: data.issue_date ? new Date(data.issue_date) : null,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        credential_id: data.credential_id ?? null,
        credential_url: data.credential_url ?? null,
        does_not_expire: data.does_not_expire ?? false,
      },
    });
  }

  async deleteCertification(certId: string) {
    return this.prisma.candidateCertification.delete({
      where: { id: certId },
    });
  }

  async updateTraining(trainingId: string, data: any) {
    return this.prisma.candidateTraining.update({
      where: { id: trainingId },
      data: {
        course_name: data.course_name ?? undefined,
        provider: data.provider ?? undefined,
        completed_date: data.completed_date ? new Date(data.completed_date) : undefined,
        duration: data.duration ?? undefined,
        description: data.description ?? undefined,
        certificate_url: data.certificate_url ?? undefined,
      },
    });
  }

  async createTraining(candidateId: string, data: any) {
    return this.prisma.candidateTraining.create({
      data: {
        candidate_id: candidateId,
        course_name: data.course_name,
        provider: data.provider,
        completed_date: data.completed_date ? new Date(data.completed_date) : null,
        duration: data.duration ?? null,
        description: data.description ?? null,
        certificate_url: data.certificate_url ?? null,
      },
    });
  }

  async deleteTraining(trainingId: string) {
    return this.prisma.candidateTraining.delete({
      where: { id: trainingId },
    });
  }

  // Update Work Experience Methods
  async updateWorkExperience(experienceId: string, data: any) {
    return this.prisma.candidateWorkExperience.update({
      where: { id: experienceId },
      data: {
        company: data.company ?? undefined,
        role: data.role ?? undefined,
        start_date: data.start_date ? new Date(data.start_date) : undefined,
        end_date: data.end_date ? new Date(data.end_date) : undefined,
        current: data.current ?? undefined,
        description: data.description ?? undefined,
        location: data.location ?? undefined,
      },
    });
  }

  async createWorkExperience(candidateId: string, data: any) {
    return this.prisma.candidateWorkExperience.create({
      data: {
        candidate_id: candidateId,
        company: data.company,
        role: data.role,
        start_date: new Date(data.start_date),
        end_date: data.end_date ? new Date(data.end_date) : null,
        current: data.current ?? false,
        description: data.description ?? null,
        location: data.location ?? null,
      },
    });
  }

  async deleteWorkExperience(experienceId: string) {
    return this.prisma.candidateWorkExperience.delete({
      where: { id: experienceId },
    });
  }

  // Notification Preferences
  async getNotificationPreferences(candidateId: string) {
    return this.prisma.notificationPreferences.findUnique({
      where: { candidate_id: candidateId }
    });
  }

  async upsertNotificationPreferences(candidateId: string, data: any) {
    return this.prisma.notificationPreferences.upsert({
      where: { candidate_id: candidateId },
      update: {
        application_status_changes: data.application_status_changes,
        interview_reminders: data.interview_reminders,
        job_match_alerts: data.job_match_alerts,
        messages: data.messages,
        system_updates: data.system_updates,
        email_enabled: data.email_enabled,
        in_app_enabled: data.in_app_enabled,
        reminder_hours_before: data.reminder_hours_before,
      },
      create: {
        candidate_id: candidateId,
        application_status_changes: data.application_status_changes ?? true,
        interview_reminders: data.interview_reminders ?? true,
        job_match_alerts: data.job_match_alerts ?? true,
        messages: data.messages ?? true,
        system_updates: data.system_updates ?? true,
        email_enabled: data.email_enabled ?? true,
        in_app_enabled: data.in_app_enabled ?? true,
        reminder_hours_before: data.reminder_hours_before ?? 24,
      },
    });
  }

  // Skills Methods
  async getSkills(candidateId: string) {
    return this.prisma.candidateSkill.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' }
    });
  }

  async createSkill(candidateId: string, data: any) {
    return this.prisma.candidateSkill.create({
      data: {
        candidate_id: candidateId,
        name: data.name,
        level: data.level ?? null,
      },
    });
  }

  async updateSkill(skillId: string, data: any) {
    return this.prisma.candidateSkill.update({
      where: { id: skillId },
      data: {
        name: data.name ?? undefined,
        level: data.level ?? undefined,
      },
    });
  }

  async deleteSkill(skillId: string) {
    return this.prisma.candidateSkill.delete({
      where: { id: skillId },
    });
  }

  // Saved Jobs Methods
  async getSavedJobs(candidateId: string) {
    return this.prisma.savedJob.findMany({
      where: { candidate_id: candidateId },
      include: {
        job: {
          include: {
            company: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async deleteSavedJob(candidateId: string, jobId: string) {
    return this.prisma.savedJob.deleteMany({
      where: {
        candidate_id: candidateId,
        job_id: jobId
      }
    });
  }

  // Saved Searches Methods
  async getSavedSearches(candidateId: string) {
    return this.prisma.savedSearch.findMany({
      where: { candidate_id: candidateId },
      orderBy: { last_searched_at: 'desc' }
    });
  }

  async deleteSavedSearch(searchId: string) {
    return this.prisma.savedSearch.delete({
      where: { id: searchId }
    });
  }

  // Job Alerts Methods
  async getJobAlerts(candidateId: string) {
    return this.prisma.jobAlert.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' }
    });
  }

  async createJobAlert(candidateId: string, data: any) {
    return this.prisma.jobAlert.create({
      data: {
        candidate_id: candidateId,
        name: data.name,
        criteria: data.criteria || {},
        frequency: data.frequency || 'DAILY',
        channels: data.channels || ['EMAIL'],
        is_active: data.isActive ?? true,
      }
    });
  }

  async updateJobAlert(alertId: string, data: any) {
    return this.prisma.jobAlert.update({
      where: { id: alertId },
      data: {
        name: data.name ?? undefined,
        criteria: data.criteria ?? undefined,
        frequency: data.frequency ?? undefined,
        channels: data.channels ?? undefined,
        is_active: data.isActive ?? undefined,
      }
    });
  }

  async deleteJobAlert(alertId: string) {
    return this.prisma.jobAlert.delete({
      where: { id: alertId }
    });
  }
}
