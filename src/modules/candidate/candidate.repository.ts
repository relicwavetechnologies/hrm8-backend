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

  // --- Work Experience ---

  async createWorkExperience(candidateId: string, data: any) {
    return this.prisma.candidateWorkExperience.create({
      data: {
        candidate_id: candidateId,
        company: data.company,
        role: data.role,
        start_date: new Date(data.startDate),
        end_date: data.endDate ? new Date(data.endDate) : null,
        current: data.current || false,
        description: data.description,
        location: data.location,
      },
    });
  }

  async findWorkExperienceById(id: string) {
    return this.prisma.candidateWorkExperience.findUnique({
      where: { id },
    });
  }

  async findWorkExperienceByCandidate(candidateId: string) {
    return this.prisma.candidateWorkExperience.findMany({
      where: { candidate_id: candidateId },
      orderBy: { start_date: 'desc' },
    });
  }

  async updateWorkExperience(id: string, data: any) {
    const updateData: any = {};
    if (data.company) updateData.company = data.company;
    if (data.role) updateData.role = data.role;
    if (data.startDate) updateData.start_date = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.end_date = data.endDate ? new Date(data.endDate) : null;
    if (data.current !== undefined) updateData.current = data.current;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.location !== undefined) updateData.location = data.location;

    return this.prisma.candidateWorkExperience.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteWorkExperience(id: string) {
    return this.prisma.candidateWorkExperience.delete({
      where: { id },
    });
  }

  // --- Skills ---

  async findSkillsByCandidate(candidateId: string) {
    return this.prisma.candidateSkill.findMany({
      where: { candidate_id: candidateId },
    });
  }

  async updateSkills(candidateId: string, skills: Array<{ name: string; level?: string }>) {
    // Standard pattern: clear and recreate or find-and-upsert.
    // Simplifying to clear and recreate for this migration as it's common for skill tags.
    await this.prisma.$transaction([
      this.prisma.candidateSkill.deleteMany({ where: { candidate_id: candidateId } }),
      this.prisma.candidateSkill.createMany({
        data: skills.map((s) => ({
          candidate_id: candidateId,
          name: s.name,
          level: s.level,
        })),
      }),
    ]);
    return this.findSkillsByCandidate(candidateId);
  }

  // --- Education ---

  async findEducationByCandidate(candidateId: string) {
    return this.prisma.candidateEducation.findMany({
      where: { candidate_id: candidateId },
      orderBy: { start_date: 'desc' },
    });
  }

  async findEducationById(id: string) {
    return this.prisma.candidateEducation.findUnique({
      where: { id },
    });
  }

  async createEducation(candidateId: string, data: any) {
    return this.prisma.candidateEducation.create({
      data: {
        candidate_id: candidateId,
        institution: data.institution,
        degree: data.degree,
        field: data.fieldOfStudy || data.field,
        start_date: data.startDate ? new Date(data.startDate) : null,
        end_date: data.endDate ? new Date(data.endDate) : null,
        current: data.current || false,
        grade: data.grade,
        description: data.description,
      },
    });
  }

  async updateEducation(id: string, data: any) {
    const updateData: any = {};
    if (data.institution) updateData.institution = data.institution;
    if (data.degree) updateData.degree = data.degree;
    if (data.fieldOfStudy || data.field) updateData.field = data.fieldOfStudy || data.field;
    if (data.startDate !== undefined) updateData.start_date = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.end_date = data.endDate ? new Date(data.endDate) : null;
    if (data.current !== undefined) updateData.current = data.current;
    if (data.grade !== undefined) updateData.grade = data.grade;
    if (data.description !== undefined) updateData.description = data.description;

    return this.prisma.candidateEducation.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteEducation(id: string) {
    return this.prisma.candidateEducation.delete({
      where: { id },
    });
  }

  // --- Certifications ---

  async findCertificationsByCandidate(candidateId: string) {
    return this.prisma.candidateCertification.findMany({
      where: { candidate_id: candidateId },
      orderBy: { issue_date: 'desc' },
    });
  }

  async findCertificationById(id: string) {
    return this.prisma.candidateCertification.findUnique({
      where: { id },
    });
  }

  async createCertification(candidateId: string, data: any) {
    return this.prisma.candidateCertification.create({
      data: {
        candidate_id: candidateId,
        name: data.name,
        issuing_org: data.issuingOrganization || data.issuing_org,
        issue_date: data.issueDate ? new Date(data.issueDate) : null,
        expiry_date: data.expiryDate ? new Date(data.expiryDate) : null,
        credential_id: data.credentialId,
        credential_url: data.credentialUrl,
      },
    });
  }

  async updateCertification(id: string, data: any) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.issuingOrganization || data.issuing_org) updateData.issuing_org = data.issuingOrganization || data.issuing_org;
    if (data.issueDate !== undefined) updateData.issue_date = data.issueDate ? new Date(data.issueDate) : null;
    if (data.expiryDate !== undefined) updateData.expiry_date = data.expiryDate ? new Date(data.expiryDate) : null;
    if (data.credentialId !== undefined) updateData.credential_id = data.credentialId;
    if (data.credentialUrl !== undefined) updateData.credential_url = data.credentialUrl;

    return this.prisma.candidateCertification.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteCertification(id: string) {
    return this.prisma.candidateCertification.delete({
      where: { id },
    });
  }

  // --- Training ---

  async findTrainingByCandidate(candidateId: string) {
    return this.prisma.candidateTraining.findMany({
      where: { candidate_id: candidateId },
      orderBy: { completed_date: 'desc' },
    });
  }

  async findTrainingById(id: string) {
    return this.prisma.candidateTraining.findUnique({
      where: { id },
    });
  }

  async createTraining(candidateId: string, data: any) {
    return this.prisma.candidateTraining.create({
      data: {
        candidate_id: candidateId,
        course_name: data.name || data.course_name,
        provider: data.provider,
        completed_date: data.completionDate || data.completed_date ? new Date(data.completionDate || data.completed_date) : null,
        description: data.description,
      },
    });
  }

  async updateTraining(id: string, data: any) {
    const updateData: any = {};
    if (data.name || data.course_name) updateData.course_name = data.name || data.course_name;
    if (data.provider) updateData.provider = data.provider;
    if (data.completionDate !== undefined || data.completed_date !== undefined) {
      updateData.completed_date = (data.completionDate || data.completed_date) ? new Date(data.completionDate || data.completed_date) : null;
    }
    if (data.description !== undefined) updateData.description = data.description;

    return this.prisma.candidateTraining.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteTraining(id: string) {
    return this.prisma.candidateTraining.delete({
      where: { id },
    });
  }

  // --- Portfolio ---

  async findPortfolioByCandidate(candidateId: string) {
    return this.prisma.candidatePortfolio.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findPortfolioById(id: string) {
    return this.prisma.candidatePortfolio.findUnique({
      where: { id },
    });
  }

  async createPortfolio(candidateId: string, data: any) {
    return this.prisma.candidatePortfolio.create({
      data: {
        candidate_id: candidateId,
        title: data.title,
        type: data.type || 'LINK',
        external_url: data.url || data.external_url,
        description: data.description,
      },
    });
  }

  async updatePortfolio(id: string, data: any) {
    const updateData: any = {};
    if (data.title) updateData.title = data.title;
    if (data.type) updateData.type = data.type;
    if (data.url || data.external_url) updateData.external_url = data.url || data.external_url;
    if (data.description !== undefined) updateData.description = data.description;

    return this.prisma.candidatePortfolio.update({
      where: { id },
      data: updateData,
    });
  }

  async deletePortfolio(id: string) {
    return this.prisma.candidatePortfolio.delete({
      where: { id },
    });
  }

  // --- Verification ---

  async createVerificationToken(data: {
    candidateId: string;
    email: string;
    token: string;
    expiresAt: Date;
  }) {
    return this.prisma.candidateVerificationToken.create({
      data: {
        candidate_id: data.candidateId,
        email: data.email,
        token: data.token,
        expires_at: data.expiresAt,
      },
    });
  }

  async findVerificationToken(token: string) {
    return this.prisma.candidateVerificationToken.findUnique({
      where: { token },
    });
  }

  async markTokenAsUsed(id: string) {
    return this.prisma.candidateVerificationToken.update({
      where: { id },
      data: { used_at: new Date() },
    });
  }

  // --- Export ---

  async findFullProfile(candidateId: string) {
    return this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        work_experience: true,
        education: true,
        certifications: true,
        skills: true,
        training: true,
        portfolio_items: true,
        saved_jobs: true,
        job_alerts: true,
        saved_searches: true,
        job_invitation: true,
        resumes: true,
        cover_letters: true,
        notification_preferences: true,
      },
    });
  }

  // --- Saved Jobs ---

  async findSavedJobsByCandidate(candidateId: string) {
    return this.prisma.savedJob.findMany({
      where: { candidate_id: candidateId },
      include: { job: { include: { company: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async createSavedJob(candidateId: string, jobId: string) {
    return this.prisma.savedJob.create({
      data: {
        candidate_id: candidateId,
        job_id: jobId,
      },
      include: { job: true },
    });
  }

  async deleteSavedJob(candidateId: string, jobId: string) {
    return this.prisma.savedJob.delete({
      where: {
        candidate_id_job_id: {
          candidate_id: candidateId,
          job_id: jobId,
        },
      },
    });
  }

  // --- Job Alerts ---

  async findJobAlertsByCandidate(candidateId: string) {
    return this.prisma.jobAlert.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createJobAlert(candidateId: string, data: any) {
    return this.prisma.jobAlert.create({
      data: {
        candidate_id: candidateId,
        name: data.name,
        criteria: data.criteria,
        frequency: data.frequency || 'DAILY',
        channels: data.channels || ['EMAIL'],
      },
    });
  }

  async updateJobAlert(id: string, data: any) {
    return this.prisma.jobAlert.update({
      where: { id },
      data: {
        name: data.name,
        criteria: data.criteria,
        frequency: data.frequency,
        channels: data.channels,
        is_active: data.isActive,
      },
    });
  }

  async deleteJobAlert(id: string) {
    return this.prisma.jobAlert.delete({
      where: { id },
    });
  }

  // --- Saved Searches ---

  async findSavedSearchesByCandidate(candidateId: string) {
    return this.prisma.savedSearch.findMany({
      where: { candidate_id: candidateId },
      orderBy: { last_searched_at: 'desc' },
    });
  }

  async createSavedSearch(candidateId: string, data: any) {
    return this.prisma.savedSearch.create({
      data: {
        candidate_id: candidateId,
        query: data.query,
        filters: data.filters,
      },
    });
  }

  async deleteSavedSearch(id: string) {
    return this.prisma.savedSearch.delete({
      where: { id },
    });
  }

  // --- Job Invitations ---

  async findJobInvitationsByCandidate(candidateId: string) {
    return this.prisma.jobInvitation.findMany({
      where: { candidate_id: candidateId },
      include: { job: { include: { company: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async findJobInvitationByToken(token: string) {
    return this.prisma.jobInvitation.findUnique({
      where: { token },
      include: { job: true },
    });
  }

  async updateInvitationStatus(id: string, status: any) {
    return this.prisma.jobInvitation.update({
      where: { id },
      data: {
        status,
        accepted_at: status === 'ACCEPTED' ? new Date() : null,
      },
    });
  }

  // --- Resumes ---

  async findResumeById(id: string) {
    return this.prisma.candidateResume.findUnique({
      where: { id },
    });
  }

  async findResumesByCandidate(candidateId: string) {
    return this.prisma.candidateResume.findMany({
      where: { candidate_id: candidateId },
      orderBy: { uploaded_at: 'desc' },
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
        is_default: data.is_default || false,
        content: data.content,
      },
    });
  }

  async updateResume(id: string, data: any) {
    return this.prisma.candidateResume.update({
      where: { id },
      data,
    });
  }

  async deleteResume(id: string) {
    return this.prisma.candidateResume.delete({
      where: { id },
    });
  }

  async resetDefaultResumes(candidateId: string) {
    return this.prisma.candidateResume.updateMany({
      where: { candidate_id: candidateId, is_default: true },
      data: { is_default: false },
    });
  }

  // --- Cover Letters ---

  async findCoverLetterById(id: string) {
    return this.prisma.candidateCoverLetter.findUnique({
      where: { id },
    });
  }

  async findCoverLettersByCandidate(candidateId: string) {
    return this.prisma.candidateCoverLetter.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createCoverLetter(candidateId: string, data: any) {
    return this.prisma.candidateCoverLetter.create({
      data: {
        candidate_id: candidateId,
        title: data.title,
        content: data.content,
        file_url: data.file_url,
        file_name: data.file_name,
        file_size: data.file_size,
        file_type: data.file_type,
        is_template: data.is_template || false,
        is_draft: data.is_draft ?? true,
      },
    });
  }

  async updateCoverLetter(id: string, data: any) {
    return this.prisma.candidateCoverLetter.update({
      where: { id },
      data,
    });
  }

  async deleteCoverLetter(id: string) {
    return this.prisma.candidateCoverLetter.delete({
      where: { id },
    });
  }

  // --- Notification Preferences ---

  async findNotificationPreferences(candidateId: string) {
    return this.prisma.notificationPreferences.findUnique({
      where: { candidate_id: candidateId },
    });
  }

  async upsertNotificationPreferences(candidateId: string, data: any) {
    return this.prisma.notificationPreferences.upsert({
      where: { candidate_id: candidateId },
      create: {
        candidate_id: candidateId,
        ...data,
      },
      update: data,
    });
  }

  // --- Candidate Preferences & Photo ---

  async updatePreferences(id: string, data: any) {
    return this.prisma.candidate.update({
      where: { id },
      data: {
        job_type_preference: data.job_type_preference,
        salary_preference: data.salary_preference,
        relocation_willing: data.relocation_willing,
        remote_preference: data.remote_preference,
        visa_status: data.visa_status,
        work_eligibility: data.work_eligibility,
      },
    });
  }

  async updatePhoto(id: string, photoUrl: string) {
    return this.prisma.candidate.update({
      where: { id },
      data: { photo: photoUrl },
    });
  }
}
