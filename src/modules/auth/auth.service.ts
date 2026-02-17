import { BaseService } from '../../core/service';
import { AuthRepository } from './auth.repository';
import { CompanyRepository } from '../company/company.repository';
import { User, UserRole, UserStatus } from '@prisma/client';
import { hashPassword, comparePassword } from '../../utils/password';
import { normalizeEmail } from '../../utils/email';
import { HttpException } from '../../core/http-exception';
import { generateSessionId, getSessionExpiration, generateToken } from '../../utils/session';
import { emailService } from '../email/email.service';
import { env } from '../../config/env';

export class AuthService extends BaseService {
  constructor(
    private authRepository: AuthRepository,
    private companyRepository: CompanyRepository
  ) {
    super();
  }

  async login(data: { email: string; password: string }) {
    const user = await this.authRepository.findByEmail(normalizeEmail(data.email));

    if (!user) {
      throw new HttpException(401, 'Invalid credentials');
    }

    const isValid = await comparePassword(data.password, user.password_hash);
    if (!isValid) {
      throw new HttpException(401, 'Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new HttpException(403, `Account status: ${user.status}`);
    }

    // Update last login
    await this.authRepository.updateLastLogin(user.id);

    // Create session
    const sessionId = generateSessionId();
    const expiresAt = getSessionExpiration();

    await this.authRepository.createSession({
      session_id: sessionId,
      user: { connect: { id: user.id } },
      email: user.email,
      expires_at: expiresAt,
      company_id: user.company_id,
      user_role: user.role
    });

    return { user, sessionId };
  }

  async createSessionForUser(user: User) {
    await this.authRepository.updateLastLogin(user.id);

    const sessionId = generateSessionId();
    const expiresAt = getSessionExpiration();

    await this.authRepository.createSession({
      session_id: sessionId,
      user: { connect: { id: user.id } },
      email: user.email,
      expires_at: expiresAt,
      company_id: user.company_id,
      user_role: user.role
    });

    return { user, sessionId };
  }

  async logout(sessionId: string) {
    await this.authRepository.deleteSession(sessionId);
  }

  async registerCompanyAdmin(
    companyId: string,
    email: string,
    name: string,
    password: string,
    activate: boolean = false
  ): Promise<User> {
    const passwordHash = await hashPassword(password);

    return this.authRepository.create({
      email: normalizeEmail(email),
      name: name.trim(),
      password_hash: passwordHash,
      company: { connect: { id: companyId } },
      role: 'ADMIN', // Using string literal matching Prisma enum if needed, or import UserRole
      status: activate ? 'ACTIVE' : 'PENDING_VERIFICATION',
    });
  }

  async registerEmployee(
    companyId: string,
    email: string,
    name: string,
    password: string
  ): Promise<User> {
    const passwordHash = await hashPassword(password);

    return this.authRepository.create({
      email: normalizeEmail(email),
      name: name.trim(),
      password_hash: passwordHash,
      company: { connect: { id: companyId } },
      role: 'USER',
      status: 'ACTIVE',
    });
  }

  async getCurrentUser(userId: string) {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new HttpException(404, 'User not found');
    return user;
  }

  async signup(data: {
    firstName: string;
    lastName: string;
    businessEmail: string;
    password: string;
    acceptTerms: boolean;
    companyDomain?: string;
  }) {
    const domain = data.companyDomain || data.businessEmail.split('@')[1];
    let company = await this.companyRepository.findByDomain(domain);

    // If not found, try to find by parent domains (e.g., nst.rishihood.edu.in -> rishihood.edu.in)
    if (!company && domain.includes('.')) {
      const parts = domain.split('.');
      // Try each parent domain, e.g., for a.b.c.com, try b.c.com and c.com
      // But stop if we only have 2 parts (like google.com) or if the remaining part is a common TLD
      for (let i = 1; i < parts.length - 1; i++) {
        const parentDomain = parts.slice(i).join('.');
        company = await this.companyRepository.findByDomain(parentDomain);
        if (company) break;
      }
    }

    if (!company) {
      throw new HttpException(404, `Company with domain ${domain} not found. Please contact your administrator or register your company.`);
    }

    const passwordHash = await hashPassword(data.password);

    const signupRequest = await this.authRepository.createSignupRequest({
      email: normalizeEmail(data.businessEmail),
      name: `${data.firstName} ${data.lastName}`.trim(),
      first_name: data.firstName,
      last_name: data.lastName,
      password_hash: passwordHash,
      accepted_terms: data.acceptTerms,
      company: { connect: { id: company.id } },
      status: 'PENDING'
    });

    // Notify company admins
    try {
      const admins = await this.authRepository.findUsersByCompanyId(company.id);
      const adminEmails = admins
        .filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')
        .map(u => u.email);

      if (adminEmails.length > 0) {
        const title = 'New Access Request';
        const message = `<strong>${data.firstName} ${data.lastName}</strong> (${data.businessEmail}) has requested access to join <strong>${company.name}</strong> on HRM8. <br/><br/>Please log in to your dashboard to review and approve/reject this request.`;

        console.log(`[AuthService.signup] Sending access request notifications to: ${adminEmails.join(', ')}`);
        for (const email of adminEmails) {
          await emailService.sendNotificationEmail(email, title, message, '/users');
        }
      } else {
        console.warn(`[AuthService.signup] No admins found for company ${company.id} to notify about signup request.`);
      }
    } catch (error) {
      console.error('[AuthService.signup] Failed to send notification to admins:', error);
      // Don't fail the signup if notification fails
    }

    return {
      requestId: signupRequest.id,
      message: 'Signup request submitted successfully. Please wait for admin approval.'
    };
  }

  async registerCompany(data: {
    companyName: string;
    companyWebsite: string;
    adminFirstName: string;
    adminLastName: string;
    adminEmail: string;
    password: string;
    countryOrRegion: string;
    acceptTerms: boolean;
  }) {
    const domain = data.companyWebsite.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

    // 1. Create Company
    const company = await this.companyRepository.create({
      name: data.companyName,
      website: data.companyWebsite,
      domain: domain,
      country_or_region: data.countryOrRegion,
      accepted_terms: data.acceptTerms,
      verification_status: 'PENDING'
    });

    // 2. Create Admin User
    const passwordHash = await hashPassword(data.password);
    const user = await this.authRepository.create({
      email: normalizeEmail(data.adminEmail),
      name: `${data.adminFirstName} ${data.adminLastName}`.trim(),
      password_hash: passwordHash,
      company: { connect: { id: company.id } },
      role: 'ADMIN',
      status: 'PENDING_VERIFICATION'
    });

    // 3. Create Verification Token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await this.authRepository.createVerificationToken({
      company: { connect: { id: company.id } },
      email: user.email,
      token,
      expires_at: expiresAt
    });

    // 4. Send Verification Email
    const verificationUrl = `${env.ATS_FRONTEND_URL}/verify-company?token=${token}&companyId=${company.id}`;
    await emailService.sendCandidateVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl
    });

    return {
      companyId: company.id,
      adminUserId: user.id,
      verificationRequired: true,
      verificationMethod: 'EMAIL',
      message: 'Company registered successfully. Please verify your email.'
    };
  }

  async verifyCompany(token: string, companyId: string) {
    const verificationToken = await this.authRepository.findVerificationToken(token);

    if (!verificationToken || verificationToken.company_id !== companyId) {
      throw new HttpException(400, 'Invalid verification token');
    }

    if (verificationToken.used_at) {
      throw new HttpException(400, 'Token already used');
    }

    if (new Date() > verificationToken.expires_at) {
      throw new HttpException(400, 'Token expired');
    }

    // Mark token as used
    await this.authRepository.markVerificationTokenUsed(verificationToken.id);

    // Update company status
    await this.companyRepository.update(companyId, {
      verification_status: 'VERIFIED',
      verified_at: new Date()
    });

    // Update user status
    const users = await this.authRepository.findUsersByCompanyId(companyId);

    for (const user of users) {
      await this.authRepository.update(user.id, { status: 'ACTIVE' });
    }

    const admin = users.find(u => u.role === 'ADMIN') || users[0];

    return {
      message: 'Email verified successfully',
      email: admin.email,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        companyId: admin.company_id
      }
    };
  }

  async resendVerification(email: string) {
    const user = await this.authRepository.findByEmail(normalizeEmail(email));
    if (!user) throw new HttpException(404, 'User not found');

    if (user.status === 'ACTIVE') {
      throw new HttpException(400, 'Email already verified');
    }

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.authRepository.createVerificationToken({
      company: { connect: { id: user.company_id } },
      email: user.email,
      token,
      expires_at: expiresAt
    });

    const verificationUrl = `${env.ATS_FRONTEND_URL}/verify-company?token=${token}&companyId=${user.company_id}`;
    await emailService.sendCandidateVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl
    });

    return {
      message: 'Verification email resent successfully',
      email: user.email,
      companyId: user.company_id,
      expiresAt: expiresAt.toISOString()
    };
  }
}
