import { BaseService } from '../../core/service';
import { CandidateRepository } from './candidate.repository';
import { Candidate } from '@prisma/client';
import { hashPassword, comparePassword } from '../../utils/password';
import { normalizeEmail } from '../../utils/email';
import { HttpException } from '../../core/http-exception';
import { generateSessionId, getSessionExpiration } from '../../utils/session';
import { ResumeParserService } from '../ai/resume-parser.service';
import { CandidateMapper } from './candidate.mapper';

export class CandidateService extends BaseService {
  constructor(private candidateRepository: CandidateRepository) {
    super();
  }

  async login(data: { email: string; password: string }) {
    const candidate = await this.candidateRepository.findByEmail(normalizeEmail(data.email));

    if (!candidate) {
      throw new HttpException(401, 'Invalid credentials');
    }

    const isValid = await comparePassword(data.password, candidate.password_hash);
    if (!isValid) {
      throw new HttpException(401, 'Invalid credentials');
    }

    if (candidate.status !== 'ACTIVE') {
      throw new HttpException(403, `Account status: ${candidate.status}`);
    }

    // Update last login
    await this.candidateRepository.updateLastLogin(candidate.id);

    // Create session
    const sessionId = generateSessionId();
    const expiresAt = getSessionExpiration();

    await this.candidateRepository.createSession({
      session_id: sessionId,
      candidate: { connect: { id: candidate.id } },
      email: candidate.email,
      expires_at: expiresAt,
    });

    return { candidate: this.mapToResponse(candidate), sessionId };
  }

  async logout(sessionId: string) {
    await this.candidateRepository.deleteSession(sessionId);
  }

  async register(data: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    phone?: string;
  }): Promise<Candidate> {
    const email = normalizeEmail(data.email);
    const exists = await this.candidateRepository.findByEmail(email);
    if (exists) {
      throw new HttpException(409, 'Candidate with this email already exists');
    }

    const passwordHash = await hashPassword(data.password);
    const prismaData = CandidateMapper.profileToPrisma({
      ...data,
      email,
      status: 'ACTIVE',
    });

    const candidate = await this.candidateRepository.create({
      ...prismaData,
      password_hash: passwordHash,
    } as any);

    return this.mapToResponse(candidate);
  }

  async getProfile(id: string) {
    const candidate = await this.candidateRepository.findById(id);
    if (!candidate) throw new HttpException(404, 'Candidate not found');
    return this.mapToResponse(candidate);
  }

  async updateProfile(id: string, data: any) {
    const prismaData = CandidateMapper.profileToPrisma(data);
    const updated = await this.candidateRepository.update(id, prismaData);
    return this.mapToResponse(updated);
  }

  async updatePassword(id: string, current: string, newPass: string) {
    const candidate = await this.candidateRepository.findById(id);
    if (!candidate) throw new HttpException(404, 'Candidate not found');

    const isValid = await comparePassword(current, candidate.password_hash);
    if (!isValid) throw new HttpException(400, 'Incorrect current password');

    const passwordHash = await hashPassword(newPass);
    return this.candidateRepository.update(id, { password_hash: passwordHash });
  }

  // Work History
  async getWorkHistory(candidateId: string) {
    const data = await this.candidateRepository.findWorkExperienceByCandidateId(candidateId);
    return data.map(exp => CandidateMapper.toWorkHistoryResponse(exp));
  }

  async addWorkHistory(candidateId: string, data: any) {
    return this.candidateRepository.createWorkExperience({
      ...CandidateMapper.workExperienceToPrisma(data),
      candidate: { connect: { id: candidateId } },
    });
  }

  async updateWorkHistory(id: string, data: any) {
    return this.candidateRepository.updateWorkExperience(id, CandidateMapper.workExperienceToPrisma(data));
  }

  async deleteWorkHistory(id: string) {
    return this.candidateRepository.deleteWorkExperience(id);
  }

  // Education
  async getEducation(candidateId: string) {
    const data = await this.candidateRepository.findEducationByCandidateId(candidateId);
    return data.map(edu => CandidateMapper.toEducationResponse(edu));
  }

  async addEducation(candidateId: string, data: any) {
    return this.candidateRepository.createEducation({
      ...CandidateMapper.educationToPrisma(data),
      candidate: { connect: { id: candidateId } },
    });
  }

  async updateEducation(id: string, data: any) {
    return this.candidateRepository.updateEducation(id, CandidateMapper.educationToPrisma(data));
  }

  async deleteEducation(id: string) {
    return this.candidateRepository.deleteEducation(id);
  }

  // Skills
  async getSkills(candidateId: string) {
    const data = await this.candidateRepository.findSkillsByCandidateId(candidateId);
    return data.map(s => CandidateMapper.toSkillResponse(s));
  }

  async updateSkills(candidateId: string, skills: any[]) {
    if (!Array.isArray(skills)) throw new HttpException(400, 'Skills must be an array');
    const normalizedSkills = skills.map((s: any) => {
      if (typeof s === 'string') return { name: s, level: 'intermediate' };
      return { name: s?.name || '', level: s?.level || 'intermediate' };
    }).filter(s => s.name);

    return this.candidateRepository.updateSkills(candidateId, normalizedSkills);
  }

  // Certifications
  async getCertifications(candidateId: string) {
    const data = await this.candidateRepository.findCertificationsByCandidateId(candidateId);
    return data.map(cert => CandidateMapper.toCertificationResponse(cert));
  }

  async getExpiringCertifications(candidateId: string) {
    const data = await this.candidateRepository.findExpiringCertifications(candidateId);
    return data.map(cert => CandidateMapper.toCertificationResponse(cert));
  }

  async addCertification(candidateId: string, data: any) {
    return this.candidateRepository.createCertification({
      ...CandidateMapper.certificationToPrisma(data),
      candidate: { connect: { id: candidateId } },
    });
  }

  async updateCertification(id: string, data: any) {
    return this.candidateRepository.updateCertification(id, CandidateMapper.certificationToPrisma(data));
  }

  async deleteCertification(id: string) {
    return this.candidateRepository.deleteCertification(id);
  }

  // Training
  async getTraining(candidateId: string) {
    const data = await this.candidateRepository.findTrainingByCandidateId(candidateId);
    return data.map(t => CandidateMapper.toTrainingResponse(t));
  }

  async addTraining(candidateId: string, data: any) {
    return this.candidateRepository.createTraining({
      ...CandidateMapper.trainingToPrisma(data),
      candidate: { connect: { id: candidateId } },
    });
  }

  async updateTraining(id: string, data: any) {
    return this.candidateRepository.updateTraining(id, CandidateMapper.trainingToPrisma(data));
  }

  async deleteTraining(id: string) {
    return this.candidateRepository.deleteTraining(id);
  }

  // Resumes
  async getResumes(candidateId: string) {
    const data = await this.candidateRepository.findResumesByCandidateId(candidateId);
    return data.map(r => CandidateMapper.toResumeResponse(r));
  }

  async addResume(candidateId: string, data: any) {
    if (data.is_default) {
      await this.candidateRepository.resetDefaultResumes(candidateId);
    }

    return this.candidateRepository.createResume({
      file_name: data.file_name,
      file_url: data.file_url,
      file_size: data.file_size,
      file_type: data.file_type,
      is_default: data.is_default || false,
      candidate: { connect: { id: candidateId } },
    });
  }

  async deleteResume(id: string) {
    return this.candidateRepository.deleteResume(id);
  }

  async setDefaultResume(candidateId: string, resumeId: string) {
    await this.candidateRepository.resetDefaultResumes(candidateId);
    return this.candidateRepository.updateResume(resumeId, { is_default: true });
  }

  // Cover Letters
  async getCoverLetters(candidateId: string) {
    const data = await this.candidateRepository.findCoverLettersByCandidateId(candidateId);
    return data.map(c => CandidateMapper.toCoverLetterResponse(c));
  }

  async addCoverLetter(candidateId: string, data: any) {
    return this.candidateRepository.createCoverLetter({
      title: data.title,
      content: data.content,
      file_url: data.file_url,
      file_name: data.file_name,
      file_size: data.file_size,
      file_type: data.file_type,
      is_template: data.is_template === 'true' || data.is_template === true,
      is_draft: data.is_draft === 'true' || data.is_draft === true,
      candidate: { connect: { id: candidateId } },
    });
  }

  async deleteCoverLetter(id: string) {
    return this.candidateRepository.deleteCoverLetter(id);
  }

  async updateCoverLetter(id: string, data: any) {
    return this.candidateRepository.updateCoverLetter(id, {
      title: data.title,
      content: data.content,
      file_url: data.file_url,
      file_name: data.file_name,
      file_size: data.file_size,
      file_type: data.file_type,
      is_template: data.is_template === 'true' || data.is_template === true,
      is_draft: data.is_draft === 'true' || data.is_draft === true,
    });
  }

  // Portfolios
  async getPortfolios(candidateId: string) {
    const data = await this.candidateRepository.findPortfoliosByCandidateId(candidateId);
    return data.map(p => ({
      id: p.id,
      title: p.title,
      type: p.type,
      fileUrl: p.file_url,
      fileName: p.file_name,
      fileSize: p.file_size,
      fileType: p.file_type,
      externalUrl: p.external_url,
      platform: p.platform,
      description: p.description,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  }

  async addPortfolio(candidateId: string, data: any) {
    return this.candidateRepository.createPortfolio({
      title: data.title,
      type: data.type,
      file_url: data.file_url,
      file_name: data.file_name,
      file_size: data.file_size,
      file_type: data.file_type,
      external_url: data.external_url,
      platform: data.platform,
      description: data.description,
      candidate: { connect: { id: candidateId } },
    });
  }

  async deletePortfolio(id: string) {
    return this.candidateRepository.deletePortfolio(id);
  }

  async updatePortfolio(id: string, data: any) {
    return this.candidateRepository.updatePortfolio(id, {
      title: data.title,
      type: data.type,
      file_url: data.file_url,
      file_name: data.file_name,
      file_size: data.file_size,
      file_type: data.file_type,
      external_url: data.external_url,
      platform: data.platform,
      description: data.description,
    });
  }

  // Saved Jobs
  async getSavedJobs(candidateId: string) {
    const data = await this.candidateRepository.findSavedJobsByCandidateId(candidateId);
    return data.map((s: any) => ({
      id: s.id,
      jobId: s.job_id,
      createdAt: s.created_at,
      job: s.job ? {
        id: s.job.id,
        title: s.job.title,
        location: s.job.location,
        workArrangement: s.job.work_arrangement,
        employmentType: s.job.employment_type,
        postingDate: s.job.posting_date,
        salaryMin: s.job.salary_min,
        salaryMax: s.job.salary_max,
        salaryCurrency: s.job.salary_currency,
        company: s.job.company ? {
          id: s.job.company.id,
          name: s.job.company.name,
        } : null,
      } : null,
    }));
  }

  async saveJob(candidateId: string, jobId: string) {
    return this.candidateRepository.createSavedJob(candidateId, jobId);
  }

  async unsaveJob(candidateId: string, jobId: string) {
    return this.candidateRepository.deleteSavedJob(candidateId, jobId);
  }

  // Saved Searches
  async getSavedSearches(candidateId: string) {
    return this.candidateRepository.findSavedSearchesByCandidateId(candidateId);
  }

  async saveSearch(candidateId: string, data: { query?: string; filters: any }) {
    return this.candidateRepository.createSavedSearch(candidateId, data);
  }

  async deleteSavedSearch(id: string) {
    return this.candidateRepository.deleteSavedSearch(id);
  }

  // Job Alerts
  async getJobAlerts(candidateId: string) {
    const data = await this.candidateRepository.findJobAlertsByCandidateId(candidateId);
    return data.map((ja: any) => ({
      id: ja.id,
      name: ja.name,
      criteria: ja.criteria,
      frequency: ja.frequency,
      channels: ja.channels,
      isActive: ja.is_active,
      createdAt: ja.created_at,
    }));
  }

  async addJobAlert(candidateId: string, data: any) {
    return this.candidateRepository.createJobAlert({
      ...data,
      candidate: { connect: { id: candidateId } },
    });
  }

  async deleteJobAlert(id: string) {
    return this.candidateRepository.deleteJobAlert(id);
  }

  // Resume Parsing Stub
  async parseResume(candidateId: string, file: any) {
    if (!file) throw new HttpException(400, 'Resume file is required');

    const parsedData = await ResumeParserService.parseResume(file.buffer, file.mimetype);

    // Save common fields to candidate profile
    await this.candidateRepository.update(candidateId, {
      first_name: parsedData.firstName || undefined,
      last_name: parsedData.lastName || undefined,
      phone: parsedData.phone || undefined,
      linked_in_url: parsedData.linkedInUrl || undefined,
    });

    return parsedData;
  }

  async populateCandidateProfileFromResume(candidateId: string, parsedData: any) {
    const promises = [];

    if (parsedData.workExperience?.length) {
      promises.push(this.prisma.candidateWorkExperience.createMany({
        data: parsedData.workExperience.map((exp: any) => ({
          ...CandidateMapper.workExperienceToPrisma(exp),
          candidate_id: candidateId,
        }))
      }));
    }

    if (parsedData.education?.length) {
      promises.push(this.prisma.candidateEducation.createMany({
        data: parsedData.education.map((edu: any) => ({
          ...CandidateMapper.educationToPrisma(edu),
          candidate_id: candidateId,
        }))
      }));
    }

    if (parsedData.skills?.length) {
      promises.push(this.candidateRepository.updateSkills(
        candidateId,
        parsedData.skills.map((skill: string) => ({ name: skill }))
      ));
    }

    if (parsedData.certifications?.length) {
      promises.push(this.prisma.candidateCertification.createMany({
        data: parsedData.certifications.map((cert: any) => ({
          ...CandidateMapper.certificationToPrisma(cert),
          candidate_id: candidateId,
        }))
      }));
    }

    await Promise.all(promises);
  }

  // Get recommended jobs
  async getRecommendedJobs(candidateId: string) {
    // This is a stub for recommendation logic
    // In a real scenario, this would query jobs based on candidate skills/experience
    return [];
  }

  async deleteAccount(id: string) {
    // Cascade delete is handled by Prisma (onDelete: Cascade in schema)
    return this.candidateRepository.delete(id);
  }

  async exportData(id: string) {
    const fullProfile = await this.candidateRepository.findFullProfile(id);
    if (!fullProfile) throw new HttpException(404, 'Candidate not found');

    // Remove sensitive data
    const { password_hash, ...safeData } = fullProfile as any;
    return safeData;
  }

  async verifyEmail(token: string) {
    const tokenRecord = await this.candidateRepository.findVerificationToken(token);

    if (!tokenRecord) {
      throw new HttpException(404, 'Invalid verification token');
    }

    if (tokenRecord.used_at) {
      throw new HttpException(400, 'Token already used');
    }

    if (tokenRecord.expires_at < new Date()) {
      throw new HttpException(400, 'Token expired');
    }

    await this.candidateRepository.markTokenAsUsed(tokenRecord.id);
    await this.candidateRepository.update(tokenRecord.candidate_id, { email_verified: true });

    return { message: 'Email verified successfully' };
  }

  async updatePhoto(id: string, photoUrl: string) {
    const updated = await this.candidateRepository.updatePhoto(id, photoUrl);
    return this.mapToResponse(updated);
  }

  private mapToResponse(candidate: any): any {
    if (!candidate) return null;

    return {
      ...candidate,
      // Map database fields to camelCase
      firstName: candidate.first_name,
      lastName: candidate.last_name,
      linkedInUrl: candidate.linked_in_url,
      visaStatus: candidate.visa_status,
      workEligibility: candidate.work_eligibility,
      jobTypePreference: candidate.job_type_preference,
      salaryPreference: candidate.salary_preference,
      relocationWilling: candidate.relocation_willing,
      remotePreference: candidate.remote_preference,
      emailVerified: candidate.email_verified,
      lastLoginAt: candidate.last_login_at,
      createdAt: candidate.created_at,
      updatedAt: candidate.updated_at,
      resumeUrl: candidate.resume_url,

      // Relations
      workExperience: candidate.work_experience ? candidate.work_experience.map((exp: any) => CandidateMapper.toWorkHistoryResponse(exp)) : undefined,
      education: candidate.education ? candidate.education.map((edu: any) => CandidateMapper.toEducationResponse(edu)) : undefined,
      certifications: candidate.certifications ? candidate.certifications.map((c: any) => CandidateMapper.toCertificationResponse(c)) : undefined,
      training: candidate.training ? candidate.training.map((t: any) => CandidateMapper.toTrainingResponse(t)) : undefined,
      resumes: candidate.resumes ? candidate.resumes.map((r: any) => CandidateMapper.toResumeResponse(r)) : undefined,
      coverLetters: candidate.cover_letters ? candidate.cover_letters.map((c: any) => CandidateMapper.toCoverLetterResponse(c)) : undefined,
      portfolioItems: candidate.portfolio_items ? candidate.portfolio_items.map((p: any) => CandidateMapper.toPortfolioResponse(p)) : undefined,
      skills: candidate.skills ? candidate.skills.map((s: any) => CandidateMapper.toSkillResponse(s)) : undefined,
    };
  }
}
