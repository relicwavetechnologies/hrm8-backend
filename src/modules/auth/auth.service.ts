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
    const normalizedEmail = normalizeEmail(data.email);
    console.log('[AuthService.login] Attempt', { email: normalizedEmail });
    const user = await this.authRepository.findByEmail(normalizedEmail);

    if (!user) {
      console.warn('[AuthService.login] User not found', { email: normalizedEmail });
      throw new HttpException(401, 'Invalid credentials');
    }

    const isValid = await comparePassword(data.password, user.password_hash);
    if (!isValid) {
      console.warn('[AuthService.login] Invalid password', { userId: user.id, email: normalizedEmail });
      throw new HttpException(401, 'Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      console.warn('[AuthService.login] Blocked by user status', { userId: user.id, status: user.status });
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

    console.log('[AuthService.login] Session created', { userId: user.id, companyId: user.company_id, role: user.role });
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
    const normalizedBusinessEmail = normalizeEmail(data.businessEmail);
    console.log('[AuthService.signup] Start', {
      businessEmail: normalizedBusinessEmail,
      providedCompanyDomain: data.companyDomain || null,
    });

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
      console.warn('[AuthService.signup] No company found for domain', { domain, businessEmail: normalizedBusinessEmail });
      throw new HttpException(404, `Company with domain ${domain} not found. Please contact your administrator or register your company.`);
    }

    const existingUser = await this.authRepository.findByEmail(normalizedBusinessEmail);
    if (existingUser) {
      console.warn('[AuthService.signup] Existing user conflict', {
        businessEmail: normalizedBusinessEmail,
        existingUserId: existingUser.id,
      });
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
      console.warn('[AuthService.signup] Existing pending signup request', {
        businessEmail: normalizedBusinessEmail,
        companyId: company.id,
        requestId: existingPendingRequest.id,
      });
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
    console.log('[AuthService.signup] Signup request created', {
      requestId: signupRequest.id,
      companyId: company.id,
      businessEmail: normalizedBusinessEmail,
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
    const normalizedAdminEmail = normalizeEmail(data.adminEmail);
    console.log('[AuthService.registerCompany] Start', {
      adminEmail: normalizedAdminEmail,
      companyWebsite: data.companyWebsite,
    });

    if (!data.acceptTerms) {
      throw new HttpException(400, 'You must accept the Terms & Conditions and Privacy Policy to continue.');
    }

    const domain = this.extractDomain(data.companyWebsite);
    const passwordHash = await hashPassword(data.password);
    console.log('[AuthService.registerCompany] Normalized payload', { domain, adminEmail: normalizedAdminEmail });

    // Idempotent recovery for duplicate submits/reloads after slow network.
    const existingCompany = await prisma.company.findUnique({
      where: { domain },
      select: { id: true },
    });
    if (existingCompany) {
      console.log('[AuthService.registerCompany] Existing company found for domain', {
        domain,
        companyId: existingCompany.id,
      });
      const existingAdmin = await prisma.user.findFirst({
        where: {
          company_id: existingCompany.id,
          email: normalizedAdminEmail,
          status: 'PENDING_VERIFICATION',
        },
        select: { id: true, email: true, name: true },
      });

      if (existingAdmin) {
        console.log('[AuthService.registerCompany] Existing pending admin found, issuing fresh token', {
          companyId: existingCompany.id,
          adminUserId: existingAdmin.id,
        });
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const verificationToken = await prisma.verificationToken.create({
          data: {
            company: { connect: { id: existingCompany.id } },
            email: existingAdmin.email,
            token,
            expires_at: expiresAt,
          },
        });

        try {
          await this.sendVerificationEmailStrict({
            to: existingAdmin.email,
            name: existingAdmin.name,
            token,
            companyId: existingCompany.id,
          });
        } catch (error) {
          console.error('[AuthService.registerCompany] Failed to send idempotent verification email', {
            companyId: existingCompany.id,
            adminEmail: existingAdmin.email,
            error: error instanceof Error ? error.message : String(error),
          });
          await prisma.verificationToken.delete({ where: { id: verificationToken.id } }).catch((cleanupError) => {
            console.error('[AuthService.registerCompany] Cleanup failed for idempotent token', {
              tokenId: verificationToken.id,
              error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
            });
          });
          throw new HttpException(503, 'Unable to send verification email right now. Please try again in a few minutes.');
        }

        return {
          companyId: existingCompany.id,
          adminUserId: existingAdmin.id,
          verificationRequired: true,
          verificationMethod: 'EMAIL',
          message: 'Registration already exists and is pending verification. A fresh verification email has been sent.',
        };
      }
      console.warn('[AuthService.registerCompany] Existing company found but no matching pending admin', {
        domain,
        companyId: existingCompany.id,
        adminEmail: normalizedAdminEmail,
      });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

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

        return { company, user, token };
      });
      console.log('[AuthService.registerCompany] DB records created', {
        companyId: result.company.id,
        adminUserId: result.user.id,
      });

      // Attempt to send verification email. If it fails, DO NOT roll back — the user
      // remains in PENDING_VERIFICATION and can use "Resend Verification" to try again.
      let emailSent = true;
      try {
        await this.sendVerificationEmailStrict({
          to: result.user.email,
          name: result.user.name,
          token: result.token,
          companyId: result.company.id,
        });
      } catch (error) {
        emailSent = false;
        console.error('[AuthService.registerCompany] Verification email failed — keeping DB records, user can resend.', {
          companyId: result.company.id,
          adminUserId: result.user.id,
          adminEmail: result.user.email,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      console.log('[AuthService.registerCompany] Success', {
        companyId: result.company.id,
        adminUserId: result.user.id,
        emailSent,
      });

      return {
        companyId: result.company.id,
        adminUserId: result.user.id,
        verificationRequired: true,
        verificationMethod: 'EMAIL',
        emailSent,
        message: emailSent
          ? 'Company registered successfully. Please verify your email.'
          : 'Company registered successfully. We could not send a verification email right now — please use the \'Resend Verification\' option on the login page.',
      };
    } catch (error) {
      console.error('[AuthService.registerCompany] Failed', {
        adminEmail: normalizedAdminEmail,
        domain,
        error: error instanceof Error ? error.message : String(error),
      });
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
    const normalizedEmail = normalizeEmail(email);
    console.log('[AuthService.resendVerification] Start', { email: normalizedEmail });
    const user = await this.authRepository.findByEmail(normalizedEmail);
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
    try {
      await emailService.sendCandidateVerificationEmail({
        to: user.email,
        name: user.name,
        verificationUrl,
        strict: true,
      });
    } catch (error) {
      console.error('[AuthService.resendVerification] Email send failed', {
        userId: user.id,
        email: user.email,
        companyId: user.company_id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new HttpException(503, 'Unable to send verification email right now. Please try again in a few minutes.');
    }

    console.log('[AuthService.resendVerification] Success', {
      userId: user.id,
      email: user.email,
      companyId: user.company_id,
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

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes('smtp') ||
        message.includes('send email') ||
        message.includes('enotfound') ||
        message.includes('econnrefused') ||
        message.includes('etimedout')
      ) {
        throw new HttpException(503, 'Unable to send verification email right now. Please try again in a few minutes.');
      }
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

  private async sendVerificationEmailStrict(input: { to: string; name: string; token: string; companyId: string }) {
    const verificationUrl = `${env.ATS_FRONTEND_URL}/verify-company?token=${input.token}&companyId=${input.companyId}`;
    console.log('[AuthService.sendVerificationEmailStrict] Sending verification email', {
      to: input.to,
      companyId: input.companyId,
      verificationUrl,
    });
    try {
      await emailService.sendCandidateVerificationEmail({
        to: input.to,
        name: input.name,
        verificationUrl,
        strict: true,
      });
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String((error as any).code) : undefined;
      const command = typeof error === 'object' && error && 'command' in error ? String((error as any).command) : undefined;
      console.error('[AuthService.sendVerificationEmailStrict] Failed to send verification email', {
        to: input.to,
        companyId: input.companyId,
        code,
        command,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new HttpException(503, 'Unable to send verification email right now. Please try again in a few minutes.');
    }
    console.log('[AuthService.sendVerificationEmailStrict] Sent verification email', {
      to: input.to,
      companyId: input.companyId,
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
