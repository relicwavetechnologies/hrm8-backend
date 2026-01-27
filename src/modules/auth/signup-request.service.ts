import { BaseService } from '../../core/service';
import { SignupRequest } from '@prisma/client';
import { signupRequestRepository } from './signup-request.repository';
import { HttpException } from '../../core/http-exception';
import { hashPassword } from '../../utils/password';
import { normalizeEmail } from '../../utils/email';

export class SignupRequestService extends BaseService {
  /**
   * Create a new signup request
   */
  async createSignupRequest(data: {
    companyId: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    password: string;
    acceptedTerms?: boolean;
  }): Promise<SignupRequest> {
    const normalizedEmail = normalizeEmail(data.email);

    // Check if there's already a pending request for this email
    const existingRequest = await signupRequestRepository.findByEmail(normalizedEmail);
    if (existingRequest && existingRequest.status === 'PENDING') {
      throw new HttpException(409, 'A signup request with this email is already pending approval.');
    }

    // Hash the password
    const passwordHash = await hashPassword(data.password);

    // Create the signup request
    return signupRequestRepository.create({
      company: { connect: { id: data.companyId } },
      email: normalizedEmail,
      name: data.name,
      first_name: data.firstName || '',
      last_name: data.lastName || '',
      password_hash: passwordHash,
      accepted_terms: data.acceptedTerms || false,
      status: 'PENDING',
    });
  }

  /**
   * Get signup request by ID
   */
  async getSignupRequest(id: string): Promise<SignupRequest | null> {
    return signupRequestRepository.findById(id);
  }

  /**
   * Get all signup requests for a company
   */
  async getSignupRequestsByCompany(companyId: string): Promise<SignupRequest[]> {
    return signupRequestRepository.findByCompanyId(companyId);
  }

  /**
   * Approve a signup request
   */
  async approveSignupRequest(id: string, reviewedBy: string): Promise<SignupRequest> {
    const request = await signupRequestRepository.findById(id);
    if (!request) {
      throw new HttpException(404, 'Signup request not found');
    }

    if (request.status !== 'PENDING') {
      throw new HttpException(400, 'Only pending requests can be approved');
    }

    return signupRequestRepository.update(id, {
      status: 'APPROVED',
      reviewer: { connect: { id: reviewedBy } },
      reviewed_at: new Date(),
    });
  }

  /**
   * Reject a signup request
   */
  async rejectSignupRequest(id: string, reviewedBy: string, reason?: string): Promise<SignupRequest> {
    const request = await signupRequestRepository.findById(id);
    if (!request) {
      throw new HttpException(404, 'Signup request not found');
    }

    if (request.status !== 'PENDING') {
      throw new HttpException(400, 'Only pending requests can be rejected');
    }

    return signupRequestRepository.update(id, {
      status: 'REJECTED',
      reviewer: { connect: { id: reviewedBy } },
      reviewed_at: new Date(),
      rejection_reason: reason,
    });
  }
}

export const signupRequestService = new SignupRequestService();
