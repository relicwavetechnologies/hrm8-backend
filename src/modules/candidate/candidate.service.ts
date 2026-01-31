import { BaseService } from '../../core/service';
import { CandidateRepository } from './candidate.repository';
import { Candidate, AssessmentStatus } from '@prisma/client';
import { hashPassword, comparePassword } from '../../utils/password';
import { normalizeEmail } from '../../utils/email';
import { HttpException } from '../../core/http-exception';
import { generateSessionId, getSessionExpiration } from '../../utils/session';
import { generateToken } from '../../utils/token';
import { emailService } from '../email/email.service';

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

    const candidate = await this.candidateRepository.create({
      email,
      first_name: data.firstName,
      last_name: data.lastName,
      password_hash: passwordHash,
      phone: data.phone,
      status: 'PENDING_VERIFICATION',
    });

    // Generate and send verification token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.candidateRepository.createVerificationToken({
      candidate: { connect: { id: candidate.id } },
      email: candidate.email,
      token,
      expires_at: expiresAt,
    });

    // Send verification email
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
    try {
      await emailService.sendCandidateVerificationEmail({
        to: candidate.email,
        name: candidate.first_name || 'User',
        verificationUrl,
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't throw error, user can resend
    }

    return candidate;
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

  async verifyEmail(token: string) {
    const verificationToken = await this.candidateRepository.findVerificationTokenByToken(token);

    if (!verificationToken) {
      throw new HttpException(400, 'Invalid verification token');
    }

    // Check if token is expired
    if (new Date() > verificationToken.expires_at) {
      throw new HttpException(400, 'Verification token has expired');
    }

    // Check if token is already used
    if (verificationToken.used_at) {
      throw new HttpException(400, 'Verification token has already been used');
    }

    // Mark token as used
    await this.candidateRepository.markVerificationTokenUsed(verificationToken.id);

    // Update candidate status to ACTIVE
    const candidate = await this.candidateRepository.update(verificationToken.candidate.id, {
      status: 'ACTIVE',
    });

    // Create auto-login session
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

  async getCurrentCandidate(id: string): Promise<Candidate> {
    const candidate = await this.candidateRepository.findById(id);
    if (!candidate) throw new HttpException(404, 'Candidate not found');
    return candidate;
  }

  // Assessment Methods
  async getAssessments(candidateId: string) {
    const assessments = await this.candidateRepository.getAssessments(candidateId);

    // Enrich with job title and round name
    return Promise.all(assessments.map(async (assessment: any) => {
      let jobTitle = 'Unknown Job';
      let roundName = 'Assessment';

      if (assessment.job_round_id) {
        const jobRound = await this.candidateRepository.getJobRoundWithJob(assessment.job_round_id);

        if (jobRound) {
          roundName = jobRound.name;
          if (jobRound.job) jobTitle = jobRound.job.title;
        }
      }

      if (jobTitle === 'Unknown Job' && assessment.job_id) {
        const job = await this.candidateRepository.getJobTitle(assessment.job_id);
        if (job) jobTitle = job.title;
      }

      return {
        ...assessment,
        jobTitle,
        roundName,
      };
    }));
  }

  async getAssessmentDetails(candidateId: string, assessmentId: string) {
    const assessment = await this.candidateRepository.getAssessmentById(assessmentId, candidateId);

    if (!assessment) {
      throw new HttpException(404, 'Assessment not found');
    }

    // Fetch job info and config
    let jobTitle = '';
    if (assessment.job_id) {
      const job = await this.candidateRepository.getJobTitle(assessment.job_id);
      if (job) jobTitle = job.title;
    }

    let config = null;
    if (assessment.job_round_id) {
      config = await this.candidateRepository.getAssessmentConfig(assessment.job_round_id);
    }

    return {
      ...assessment,
      jobTitle,
      config: config ? {
        timeLimitMinutes: config.time_limit_minutes,
        instructions: config.instructions
      } : null
    };
  }

  async startAssessment(candidateId: string, assessmentId: string) {
    // Verify assessment exists and belongs to candidate
    const assessment = await this.candidateRepository.getAssessmentById(assessmentId, candidateId);

    if (!assessment) {
      throw new HttpException(404, 'Assessment not found');
    }

    if (assessment.status !== AssessmentStatus.INVITED && assessment.status !== AssessmentStatus.IN_PROGRESS) {
      throw new HttpException(400, 'Assessment cannot be started');
    }

    // If already in progress, just return success
    if (assessment.status === AssessmentStatus.IN_PROGRESS) {
      return { message: 'Assessment already in progress' };
    }

    // Update status
    const startedAt = new Date().toISOString();
    await this.candidateRepository.updateAssessmentStatus(assessmentId, 'IN_PROGRESS', startedAt);

    return { message: 'Assessment started', startedAt };
  }

  async submitAssessment(candidateId: string, assessmentId: string, answers: Array<{ questionId: string; response: string }>) {
    if (!answers || !Array.isArray(answers)) {
      throw new HttpException(400, 'Invalid answers format');
    }

    // Verify assessment exists and belongs to candidate
    const assessment = await this.candidateRepository.getAssessmentById(assessmentId, candidateId);

    if (!assessment) {
      throw new HttpException(404, 'Assessment not found');
    }

    if (assessment.status === AssessmentStatus.COMPLETED) {
      throw new HttpException(400, 'Assessment already completed');
    }

    // Save responses using repository transaction
    await this.candidateRepository.submitAssessmentResponses(assessmentId, candidateId, answers);

    return { message: 'Assessment submitted successfully' };
  }

  // Documents Methods
  async updateDocuments(candidateId: string, data: any) {
    if (!data.resumes && !data.coverLetters && !data.portfolios) {
      throw new HttpException(400, 'No document updates provided');
    }

    const updates: any = {};

    if (data.resumes && Array.isArray(data.resumes)) {
      updates.resumes = await Promise.all(
        data.resumes.map(async (resume: any) => {
          if (resume.id) {
            return this.candidateRepository.updateResume(resume.id, candidateId, resume);
          } else {
            return this.candidateRepository.createResume(candidateId, resume);
          }
        })
      );
    }

    if (data.coverLetters && Array.isArray(data.coverLetters)) {
      updates.coverLetters = await Promise.all(
        data.coverLetters.map(async (letter: any) => {
          if (letter.id) {
            return this.candidateRepository.updateCoverLetter(letter.id, letter);
          } else {
            return this.candidateRepository.createCoverLetter(candidateId, letter);
          }
        })
      );
    }

    if (data.portfolios && Array.isArray(data.portfolios)) {
      updates.portfolios = await Promise.all(
        data.portfolios.map(async (portfolio: any) => {
          if (portfolio.id) {
            return this.candidateRepository.updatePortfolio(portfolio.id, portfolio);
          } else {
            return this.candidateRepository.createPortfolio(candidateId, portfolio);
          }
        })
      );
    }

    if (data.deleteResumes && Array.isArray(data.deleteResumes)) {
      await Promise.all(
        data.deleteResumes.map((id: string) => this.candidateRepository.deleteResume(id))
      );
    }

    if (data.deleteCoverLetters && Array.isArray(data.deleteCoverLetters)) {
      await Promise.all(
        data.deleteCoverLetters.map((id: string) => this.candidateRepository.deleteCoverLetter(id))
      );
    }

    if (data.deletePortfolios && Array.isArray(data.deletePortfolios)) {
      await Promise.all(
        data.deletePortfolios.map((id: string) => this.candidateRepository.deletePortfolio(id))
      );
    }

    return updates;
  }

  // Qualifications Methods
  async updateQualifications(candidateId: string, data: any) {
    if (!data.education && !data.certifications && !data.training) {
      throw new HttpException(400, 'No qualification updates provided');
    }

    const updates: any = {};

    if (data.education && Array.isArray(data.education)) {
      updates.education = await Promise.all(
        data.education.map(async (edu: any) => {
          if (edu.id) {
            return this.candidateRepository.updateEducation(edu.id, edu);
          } else {
            return this.candidateRepository.createEducation(candidateId, edu);
          }
        })
      );
    }

    if (data.certifications && Array.isArray(data.certifications)) {
      updates.certifications = await Promise.all(
        data.certifications.map(async (cert: any) => {
          if (cert.id) {
            return this.candidateRepository.updateCertification(cert.id, cert);
          } else {
            return this.candidateRepository.createCertification(candidateId, cert);
          }
        })
      );
    }

    if (data.training && Array.isArray(data.training)) {
      updates.training = await Promise.all(
        data.training.map(async (train: any) => {
          if (train.id) {
            return this.candidateRepository.updateTraining(train.id, train);
          } else {
            return this.candidateRepository.createTraining(candidateId, train);
          }
        })
      );
    }

    if (data.deleteEducation && Array.isArray(data.deleteEducation)) {
      await Promise.all(
        data.deleteEducation.map((id: string) => this.candidateRepository.deleteEducation(id))
      );
    }

    if (data.deleteCertifications && Array.isArray(data.deleteCertifications)) {
      await Promise.all(
        data.deleteCertifications.map((id: string) => this.candidateRepository.deleteCertification(id))
      );
    }

    if (data.deleteTraining && Array.isArray(data.deleteTraining)) {
      await Promise.all(
        data.deleteTraining.map((id: string) => this.candidateRepository.deleteTraining(id))
      );
    }

    return updates;
  }

  // Work History Methods
  async updateWorkHistory(candidateId: string, data: any) {
    if (!data.workExperience && !Array.isArray(data)) {
      throw new HttpException(400, 'No work history updates provided');
    }

    const workExperienceList = data.workExperience || data;
    const updates = await Promise.all(
      workExperienceList.map(async (experience: any) => {
        if (experience.id) {
          return this.candidateRepository.updateWorkExperience(experience.id, experience);
        } else {
          return this.candidateRepository.createWorkExperience(candidateId, experience);
        }
      })
    );

    if (data.deleteWorkExperience && Array.isArray(data.deleteWorkExperience)) {
      await Promise.all(
        data.deleteWorkExperience.map((id: string) => this.candidateRepository.deleteWorkExperience(id))
      );
    }

    return { workHistory: updates };
  }
}
