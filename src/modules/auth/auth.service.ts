import { BaseService } from '../../core/service';
import { AuthRepository } from './auth.repository';
import { CompanyRepository } from '../company/company.repository';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';
import { hashPassword, comparePassword } from '../../utils/password';
import { normalizeEmail } from '../../utils/email';
import { HttpException } from '../../core/http-exception';
import { generateSessionId, getSessionExpiration, generateToken } from '../../utils/session';
import { emailService } from '../email/email.service';
import { env } from '../../config/env';
import { prisma } from '../../utils/prisma';

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
    const domain = (data.companyDomain || data.businessEmail.split('@')[1] || '').trim().toLowerCase();
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

    const normalizedBusinessEmail = normalizeEmail(data.businessEmail);
    const existingUser = await this.authRepository.findByEmail(normalizedBusinessEmail);
    if (existingUser) {
      throw new HttpException(409, 'An account with this email already exists. Please log in or reset your password.');
    }

    const existingPendingRequest = await prisma.signupRequest.findFirst({
      where: {
        company_id: company.id,
        email: normalizedBusinessEmail,
        status: 'PENDING',
      },
      select: { id: true },
      orderBy: { created_at: 'desc' },
    });
    if (existingPendingRequest) {
      throw new HttpException(409, 'An access request for this email is already pending admin approval.');
    }

    const passwordHash = await hashPassword(data.password);

    const signupRequest = await this.authRepository.createSignupRequest({
      email: normalizedBusinessEmail,
      name: `${data.firstName} ${data.lastName}`.trim(),
      first_name: data.firstName,
      last_name: data.lastName,
      password_hash: passwordHash,
      accepted_terms: data.acceptTerms,
      company: { connect: { id: company.id } },
      status: 'PENDING'
    });

    // Do not block API response on email provider latency.
    this.notifyCompanyAdminsAccessRequest({
      companyId: company.id,
      companyName: company.name,
      firstName: data.firstName,
      lastName: data.lastName,
      businessEmail: data.businessEmail,
    });

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
    if (!data.acceptTerms) {
      throw new HttpException(400, 'You must accept the Terms & Conditions and Privacy Policy to continue.');
    }

    const domain = this.extractDomain(data.companyWebsite);
    const normalizedAdminEmail = normalizeEmail(data.adminEmail);
    const passwordHash = await hashPassword(data.password);

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    // Idempotent recovery for duplicate submits/reloads after slow network.
    const existingCompany = await prisma.company.findUnique({
      where: { domain },
      select: { id: true },
    });
    if (existingCompany) {
      const existingAdmin = await prisma.user.findFirst({
        where: {
          company_id: existingCompany.id,
          email: normalizedAdminEmail,
          status: 'PENDING_VERIFICATION',
        },
        select: { id: true, email: true, name: true },
      });

      if (existingAdmin) {
        await prisma.verificationToken.create({
          data: {
            company: { connect: { id: existingCompany.id } },
            email: existingAdmin.email,
            token,
            expires_at: expiresAt,
          },
        });

        this.sendVerificationEmailAsync({
          to: existingAdmin.email,
          name: existingAdmin.name,
          token,
          companyId: existingCompany.id,
        });

        return {
          companyId: existingCompany.id,
          adminUserId: existingAdmin.id,
          verificationRequired: true,
          verificationMethod: 'EMAIL',
          message: 'Registration already exists and is pending verification. A fresh verification email has been sent.',
        };
      }
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            name: data.companyName.trim(),
            website: data.companyWebsite.trim(),
            domain,
            country_or_region: data.countryOrRegion,
            accepted_terms: data.acceptTerms,
            verification_status: 'PENDING',
          },
        });

        const user = await tx.user.create({
          data: {
            email: normalizedAdminEmail,
            name: `${data.adminFirstName} ${data.adminLastName}`.trim(),
            password_hash: passwordHash,
            company: { connect: { id: company.id } },
            role: 'ADMIN',
            status: 'PENDING_VERIFICATION',
          },
        });

        await tx.verificationToken.create({
          data: {
            company: { connect: { id: company.id } },
            email: user.email,
            token,
            expires_at: expiresAt,
          },
        });

        return { company, user };
      });

      this.sendVerificationEmailAsync({
        to: result.user.email,
        name: result.user.name,
        token,
        companyId: result.company.id,
      });

      return {
        companyId: result.company.id,
        adminUserId: result.user.id,
        verificationRequired: true,
        verificationMethod: 'EMAIL',
        message: 'Company registered successfully. Please verify your email.',
      };
    } catch (error) {
      this.handleRegistrationError(error, normalizedAdminEmail, domain);
    }
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

  private extractDomain(companyWebsite: string): string {
    const raw = (companyWebsite || '').trim();
    if (!raw) {
      throw new HttpException(400, 'Company website is required.');
    }

    try {
      const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const hostname = new URL(withProtocol).hostname.toLowerCase();
      const cleaned = hostname.replace(/^www\./, '');
      if (!cleaned || !cleaned.includes('.')) {
        throw new HttpException(400, 'Please enter a valid company website.');
      }
      return cleaned;
    } catch {
      throw new HttpException(400, 'Please enter a valid company website.');
    }
  }

  private handleRegistrationError(error: unknown, normalizedEmail: string, domain: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(',') : String(error.meta?.target || '');

      if (target.includes('domain')) {
        throw new HttpException(409, `A company with domain "${domain}" already exists. If this is your company, please use employee sign-up.`);
      }
      if (target.includes('email')) {
        throw new HttpException(409, `An account with email "${normalizedEmail}" already exists. Please log in or reset your password.`);
      }

      throw new HttpException(409, 'Registration data conflicts with an existing account. Please review and try again.');
    }

    throw new HttpException(500, 'Unable to complete registration right now. Please try again.');
  }

  private sendVerificationEmailAsync(input: { to: string; name: string; token: string; companyId: string }) {
    const verificationUrl = `${env.ATS_FRONTEND_URL}/verify-company?token=${input.token}&companyId=${input.companyId}`;
    void emailService.sendCandidateVerificationEmail({
      to: input.to,
      name: input.name,
      verificationUrl,
    }).catch((error) => {
      console.error('[AuthService] Failed to send verification email:', error);
    });
  }

  private notifyCompanyAdminsAccessRequest(input: {
    companyId: string;
    companyName: string;
    firstName: string;
    lastName: string;
    businessEmail: string;
  }) {
    void (async () => {
      try {
        const admins = await this.authRepository.findUsersByCompanyId(input.companyId);
        const adminEmails = admins
          .filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')
          .map((u) => u.email);

        if (adminEmails.length === 0) {
          return;
        }

        const title = 'New Access Request';
        const message = `<strong>${input.firstName} ${input.lastName}</strong> (${input.businessEmail}) has requested access to join <strong>${input.companyName}</strong> on HRM8. <br/><br/>Please log in to your dashboard to review and approve/reject this request.`;

        await Promise.allSettled(
          adminEmails.map((email) => emailService.sendNotificationEmail(email, title, message, '/users'))
        );
      } catch (error) {
        console.error('[AuthService.signup] Failed to send notification to admins:', error);
      }
    })();
  }
}
