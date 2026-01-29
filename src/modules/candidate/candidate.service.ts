import { BaseService } from '../../core/service';
import { CandidateRepository } from './candidate.repository';
import { Candidate } from '@prisma/client';
import { hashPassword, comparePassword } from '../../utils/password';
import { normalizeEmail } from '../../utils/email';
import { HttpException } from '../../core/http-exception';
import { generateSessionId, getSessionExpiration } from '../../utils/session';

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

    return { candidate, sessionId };
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

    return this.candidateRepository.create({
      email,
      first_name: data.firstName,
      last_name: data.lastName,
      password_hash: passwordHash,
      phone: data.phone,
      status: 'ACTIVE', // Or PENDING_VERIFICATION if implementing email verify
      // verification_status removed as it's not in schema
    });
  }

  async getProfile(id: string) {
    const candidate = await this.candidateRepository.findById(id);
    if (!candidate) throw new HttpException(404, 'Candidate not found');
    return candidate;
  }

  async updateProfile(id: string, data: any) {
    return this.candidateRepository.update(id, data);
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
    return this.candidateRepository.findWorkExperienceByCandidateId(candidateId);
  }

  async addWorkHistory(candidateId: string, data: any) {
    return this.candidateRepository.createWorkExperience({
      ...data,
      candidate: { connect: { id: candidateId } },
    });
  }

  async updateWorkHistory(id: string, data: any) {
    return this.candidateRepository.updateWorkExperience(id, data);
  }

  async deleteWorkHistory(id: string) {
    return this.candidateRepository.deleteWorkExperience(id);
  }

  // Education
  async getEducation(candidateId: string) {
    return this.candidateRepository.findEducationByCandidateId(candidateId);
  }

  async addEducation(candidateId: string, data: any) {
    return this.candidateRepository.createEducation({
      ...data,
      candidate: { connect: { id: candidateId } },
    });
  }

  async updateEducation(id: string, data: any) {
    return this.candidateRepository.updateEducation(id, data);
  }

  async deleteEducation(id: string) {
    return this.candidateRepository.deleteEducation(id);
  }

  // Skills
  async getSkills(candidateId: string) {
    return this.candidateRepository.findSkillsByCandidateId(candidateId);
  }

  async updateSkills(candidateId: string, skills: any[]) {
    return this.candidateRepository.updateSkills(candidateId, skills);
  }

  // Certifications
  async getCertifications(candidateId: string) {
    return this.candidateRepository.findCertificationsByCandidateId(candidateId);
  }

  async addCertification(candidateId: string, data: any) {
    return this.candidateRepository.createCertification({
      ...data,
      candidate: { connect: { id: candidateId } },
    });
  }

  async updateCertification(id: string, data: any) {
    return this.candidateRepository.updateCertification(id, data);
  }

  async deleteCertification(id: string) {
    return this.candidateRepository.deleteCertification(id);
  }

  // Training
  async getTraining(candidateId: string) {
    return this.candidateRepository.findTrainingByCandidateId(candidateId);
  }

  async addTraining(candidateId: string, data: any) {
    return this.candidateRepository.createTraining({
      ...data,
      candidate: { connect: { id: candidateId } },
    });
  }

  async updateTraining(id: string, data: any) {
    return this.candidateRepository.updateTraining(id, data);
  }

  async deleteTraining(id: string) {
    return this.candidateRepository.deleteTraining(id);
  }

  // Resumes
  async getResumes(candidateId: string) {
    return this.candidateRepository.findResumesByCandidateId(candidateId);
  }

  async addResume(candidateId: string, data: any) {
    return this.candidateRepository.createResume({
      ...data,
      candidate: { connect: { id: candidateId } },
    });
  }

  async deleteResume(id: string) {
    return this.candidateRepository.deleteResume(id);
  }

  // Cover Letters
  async getCoverLetters(candidateId: string) {
    return this.candidateRepository.findCoverLettersByCandidateId(candidateId);
  }

  async addCoverLetter(candidateId: string, data: any) {
    return this.candidateRepository.createCoverLetter({
      ...data,
      candidate: { connect: { id: candidateId } },
    });
  }

  async deleteCoverLetter(id: string) {
    return this.candidateRepository.deleteCoverLetter(id);
  }

  // Portfolios
  async getPortfolios(candidateId: string) {
    return this.candidateRepository.findPortfoliosByCandidateId(candidateId);
  }

  async addPortfolio(candidateId: string, data: any) {
    return this.candidateRepository.createPortfolio({
      ...data,
      candidate: { connect: { id: candidateId } },
    });
  }

  async deletePortfolio(id: string) {
    return this.candidateRepository.deletePortfolio(id);
  }

  // Saved Jobs
  async getSavedJobs(candidateId: string) {
    return this.candidateRepository.findSavedJobsByCandidateId(candidateId);
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
    return this.candidateRepository.findJobAlertsByCandidateId(candidateId);
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
    // This is a stub for the AI parsing logic
    // In a real scenario, this would call an LLM or a parsing service
    return {
      workExperience: [
        {
          company: 'Sample Tech Corp',
          role: 'Senior Software Engineer',
          startDate: new Date('2020-01-01'),
          current: true,
          description: 'Extracted sample experience from resume.',
          location: 'Remote',
        }
      ],
      skills: [
        { name: 'TypeScript', level: 'expert' },
        { name: 'React', level: 'expert' },
        { name: 'Node.js', level: 'advanced' }
      ],
      education: [
        {
          institution: 'State University',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          startDate: new Date('2016-09-01'),
          endDate: new Date('2020-05-01'),
          current: false,
        }
      ],
      certifications: [],
      training: [],
      resumeUrl: 'https://sample-storage.com/resumes/sample.pdf'
    };
  }

  // Get recommended jobs
  async getRecommendedJobs(candidateId: string) {
    // This is a stub for recommendation logic
    // In a real scenario, this would query jobs based on candidate skills/experience
    return [];
  }
}
