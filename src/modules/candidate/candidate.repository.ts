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

  async findById(id: string): Promise<any | null> {
    return this.prisma.candidate.findUnique({
      where: { id },
      include: {
        work_experience: true,
        education: true,
        skills: true,
        certifications: true,
        training: true,
      },
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

  // Work Experience
  async findWorkExperienceByCandidateId(candidateId: string) {
    return this.prisma.candidateWorkExperience.findMany({
      where: { candidate_id: candidateId },
      orderBy: { start_date: 'desc' },
    });
  }

  async createWorkExperience(data: Prisma.CandidateWorkExperienceCreateInput) {
    return this.prisma.candidateWorkExperience.create({ data });
  }

  async updateWorkExperience(id: string, data: Prisma.CandidateWorkExperienceUpdateInput) {
    return this.prisma.candidateWorkExperience.update({
      where: { id },
      data,
    });
  }

  async deleteWorkExperience(id: string) {
    return this.prisma.candidateWorkExperience.delete({
      where: { id },
    });
  }

  // Education
  async findEducationByCandidateId(candidateId: string) {
    return this.prisma.candidateEducation.findMany({
      where: { candidate_id: candidateId },
      orderBy: { start_date: 'desc' },
    });
  }

  async createEducation(data: Prisma.CandidateEducationCreateInput) {
    return this.prisma.candidateEducation.create({ data });
  }

  async updateEducation(id: string, data: Prisma.CandidateEducationUpdateInput) {
    return this.prisma.candidateEducation.update({
      where: { id },
      data,
    });
  }

  async deleteEducation(id: string) {
    return this.prisma.candidateEducation.delete({
      where: { id },
    });
  }

  // Skills
  async findSkillsByCandidateId(candidateId: string) {
    return this.prisma.candidateSkill.findMany({
      where: { candidate_id: candidateId },
    });
  }

  async updateSkills(candidateId: string, skills: { name: string; level?: string }[]) {
    // Delete existing skills and replace with new ones (standard approach for simple skill lists)
    return this.prisma.$transaction([
      this.prisma.candidateSkill.deleteMany({ where: { candidate_id: candidateId } }),
      this.prisma.candidateSkill.createMany({
        data: skills.map(s => ({
          candidate_id: candidateId,
          name: s.name,
          level: s.level || 'intermediate',
        })),
      }),
    ]);
  }

  // Certifications
  async findCertificationsByCandidateId(candidateId: string) {
    return this.prisma.candidateCertification.findMany({
      where: { candidate_id: candidateId },
      orderBy: { issue_date: 'desc' },
    });
  }

  async createCertification(data: Prisma.CandidateCertificationCreateInput) {
    return this.prisma.candidateCertification.create({ data });
  }

  async updateCertification(id: string, data: Prisma.CandidateCertificationUpdateInput) {
    return this.prisma.candidateCertification.update({
      where: { id },
      data,
    });
  }

  async deleteCertification(id: string) {
    return this.prisma.candidateCertification.delete({
      where: { id },
    });
  }

  // Training
  async findTrainingByCandidateId(candidateId: string) {
    return this.prisma.candidateTraining.findMany({
      where: { candidate_id: candidateId },
      orderBy: { completed_date: 'desc' },
    });
  }

  async createTraining(data: Prisma.CandidateTrainingCreateInput) {
    return this.prisma.candidateTraining.create({ data });
  }

  async updateTraining(id: string, data: Prisma.CandidateTrainingUpdateInput) {
    return this.prisma.candidateTraining.update({
      where: { id },
      data,
    });
  }

  async deleteTraining(id: string) {
    return this.prisma.candidateTraining.delete({
      where: { id },
    });
  }

  async deleteSession(sessionId: string) {
    return this.prisma.candidateSession.delete({
      where: { session_id: sessionId },
    });
  }

  async updateSessionBySessionId(sessionId: string) {
    return this.prisma.candidateSession.update({
      where: { session_id: sessionId },
      data: { last_activity: new Date() },
    }).catch(() => { });
  }

  // Resumes
  async findResumesByCandidateId(candidateId: string) {
    return this.prisma.candidateResume.findMany({
      where: { candidate_id: candidateId },
      orderBy: { uploaded_at: 'desc' },
    });
  }

  async createResume(data: Prisma.CandidateResumeCreateInput) {
    return this.prisma.candidateResume.create({ data });
  }

  async deleteResume(id: string) {
    return this.prisma.candidateResume.delete({ where: { id } });
  }

  // Cover Letters
  async findCoverLettersByCandidateId(candidateId: string) {
    return this.prisma.candidateCoverLetter.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createCoverLetter(data: Prisma.CandidateCoverLetterCreateInput) {
    return this.prisma.candidateCoverLetter.create({ data });
  }

  async deleteCoverLetter(id: string) {
    return this.prisma.candidateCoverLetter.delete({ where: { id } });
  }

  // Portfolios
  async findPortfoliosByCandidateId(candidateId: string) {
    return this.prisma.candidatePortfolio.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createPortfolio(data: Prisma.CandidatePortfolioCreateInput) {
    return this.prisma.candidatePortfolio.create({ data });
  }

  async deletePortfolio(id: string) {
    return this.prisma.candidatePortfolio.delete({ where: { id } });
  }

  // Saved Jobs
  async findSavedJobsByCandidateId(candidateId: string) {
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
      include: { job: { include: { company: true } } },
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

  // Saved Searches
  async findSavedSearchesByCandidateId(candidateId: string) {
    return this.prisma.savedSearch.findMany({
      where: { candidate_id: candidateId },
      orderBy: { updated_at: 'desc' },
    });
  }

  async createSavedSearch(candidateId: string, data: { query?: string; filters: any }) {
    return this.prisma.savedSearch.create({
      data: {
        candidate_id: candidateId,
        query: data.query,
        filters: data.filters,
      },
    });
  }

  async deleteSavedSearch(id: string) {
    return this.prisma.savedSearch.delete({ where: { id } });
  }

  // Job Alerts
  async findJobAlertsByCandidateId(candidateId: string) {
    return this.prisma.jobAlert.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createJobAlert(data: Prisma.JobAlertCreateInput) {
    return this.prisma.jobAlert.create({ data });
  }

  async deleteJobAlert(id: string) {
    return this.prisma.jobAlert.delete({ where: { id } });
  }
}
