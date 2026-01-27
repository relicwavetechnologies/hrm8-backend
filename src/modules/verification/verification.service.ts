import { BaseService } from '../../core/service';
import { Company, CompanyVerificationStatus, VerificationMethod, UserStatus } from '@prisma/client';
import { HttpException } from '../../core/http-exception';
import { verificationTokenRepository } from '../auth/verification-token.repository';
import { CompanyRepository } from '../company/company.repository';
import { UserRepository } from '../user/user.repository';
import { emailService } from '../email/email.service';
import { extractEmailDomain } from '../../utils/domain';
import { normalizeEmail } from '../../utils/email';
import { generateVerificationToken } from '../../utils/token';

export class VerificationService extends BaseService {
  private companyRepository: CompanyRepository;
  private userRepository: UserRepository;

  constructor() {
    super();
    this.companyRepository = new CompanyRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Verify company using email domain check (automatic)
   * Checks if admin email domain matches company website domain
   */
  async verifyByEmailDomain(
    company: Company,
    adminEmail: string
  ): Promise<{ verified: boolean; method: VerificationMethod }> {
    const companyDomain = company.domain;
    const emailDomain = extractEmailDomain(adminEmail);

    const verified = companyDomain.toLowerCase() === emailDomain.toLowerCase();

    if (verified) {
      // Auto-verify the company
      await this.companyRepository.update(company.id, {
        verification_status: CompanyVerificationStatus.VERIFIED,
        verification_method: VerificationMethod.EMAIL_DOMAIN_CHECK,
        verified_at: new Date(),
      });

      // Activate the admin user
      const user = await this.userRepository.findByEmail(normalizeEmail(adminEmail));
      if (user && user.status === UserStatus.PENDING_VERIFICATION) {
        await this.userRepository.update(user.id, {
          status: UserStatus.ACTIVE,
        });
      }
    }

    return {
      verified,
      method: VerificationMethod.EMAIL_DOMAIN_CHECK,
    };
  }

  /**
   * Initiate email verification process
   * Sends verification email to admin
   */
  async initiateEmailVerification(
    company: Company,
    adminEmail: string
  ): Promise<{ verificationToken: string; method: VerificationMethod; expiresAt: Date }> {
    // Generate verification token
    const token = generateVerificationToken();

    // Set expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store token in database
    await verificationTokenRepository.create({
      companyId: company.id,
      email: adminEmail,
      token,
      expiresAt,
    });

    // Generate verification URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const verificationUrl = `${frontendUrl}/verify-company?token=${token}&companyId=${company.id}`;

    // Send verification email
    await this.sendVerificationEmail(adminEmail, company.name, verificationUrl);

    return {
      verificationToken: token,
      method: VerificationMethod.VERIFICATION_EMAIL,
      expiresAt,
    };
  }

  /**
   * Verify company using verification token from email
   */
  async verifyByEmailToken(
    companyId: string,
    token: string
  ): Promise<{ verified: boolean; email?: string; error?: string }> {
    // Get token data first to check if it exists
    const tokenData = await verificationTokenRepository.findByToken(token);
    if (!tokenData) {
      return { verified: false, error: 'Invalid verification token' };
    }

    // Verify company ID matches
    if (tokenData.company_id !== companyId) {
      return { verified: false, error: 'Token does not match company' };
    }

    // Validate token (check expiration and usage)
    const isValid = await verificationTokenRepository.isValidToken(token);
    if (!isValid) {
      if (tokenData.used_at) {
        return { verified: false, error: 'This verification link has already been used' };
      }
      if (tokenData.expires_at < new Date()) {
        return { verified: false, error: 'This verification link has expired. Please request a new one.' };
      }
      return { verified: false, error: 'Invalid verification token' };
    }

    // Verify company exists before updating
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      return { verified: false, error: 'Company not found' };
    }

    // Mark token as used
    await verificationTokenRepository.markAsUsed(tokenData.id);

    // Update company verification status
    await this.companyRepository.update(companyId, {
      verification_status: CompanyVerificationStatus.VERIFIED,
      verification_method: VerificationMethod.VERIFICATION_EMAIL,
      verified_at: new Date(),
    });

    // Activate the admin user
    const user = await this.userRepository.findByEmail(normalizeEmail(tokenData.email));
    if (user && user.status === UserStatus.PENDING_VERIFICATION) {
      await this.userRepository.update(user.id, {
        status: UserStatus.ACTIVE,
      });
    }

    return { verified: true, email: tokenData.email };
  }

  /**
   * Determine which verification method to use based on company and admin email
   */
  async determineVerificationMethod(
    company: Company,
    adminEmail: string
  ): Promise<VerificationMethod> {
    // Try email domain check first (automatic)
    const domainCheck = await this.verifyByEmailDomain(company, adminEmail);

    if (domainCheck.verified) {
      return VerificationMethod.EMAIL_DOMAIN_CHECK;
    }

    // If domain doesn't match, initiate email verification
    await this.initiateEmailVerification(company, adminEmail);

    return VerificationMethod.VERIFICATION_EMAIL;
  }

  /**
   * Resend verification email for a pending admin user
   */
  async resendVerificationEmail(
    email: string
  ): Promise<{ email: string; companyId: string; expiresAt: Date }> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new HttpException(404, 'No account found for this email address.');
    }

    if (user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new HttpException(409, 'This account has already been verified.');
    }

    const company = await this.companyRepository.findById(user.company_id);

    if (!company) {
      throw new HttpException(404, 'Company associated with this account could not be found.');
    }

    const { expiresAt } = await this.initiateEmailVerification(company, normalizedEmail);

    return {
      email: normalizedEmail,
      companyId: company.id,
      expiresAt,
    };
  }

  /**
   * Initiate manual verification (for GST/Registration number)
   */
  async initiateManualVerification(
    companyId: string,
    verificationData: {
      gstNumber?: string;
      registrationNumber?: string;
      linkedInUrl?: string;
    }
  ): Promise<{ method: VerificationMethod }> {
    // Update company with verification data
    await this.companyRepository.update(companyId, {
      verification_method: VerificationMethod.MANUAL_VERIFICATION,
      gst_number: verificationData.gstNumber,
      registration_number: verificationData.registrationNumber,
      linked_in_url: verificationData.linkedInUrl,
    });

    return {
      method: VerificationMethod.MANUAL_VERIFICATION,
    };
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(
    to: string,
    companyName: string,
    verificationUrl: string
  ): Promise<void> {
    await emailService.sendCompanyVerificationEmail({
      to,
      companyName,
      verificationUrl,
    });
  }
}

export const verificationService = new VerificationService();
