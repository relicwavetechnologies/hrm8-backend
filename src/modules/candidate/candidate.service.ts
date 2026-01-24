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
}
