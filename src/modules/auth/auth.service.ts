import { BaseService } from '../../core/service';
import { AuthRepository } from './auth.repository';
import { User, UserRole, UserStatus, Company, VerificationMethod } from '@prisma/client';
import { hashPassword, comparePassword } from '../../utils/password';
import { normalizeEmail } from '../../utils/email';
import { HttpException } from '../../core/http-exception';
import { generateSessionId, getSessionExpiration } from '../../utils/session';
import { CompanyService } from '../company/company.service';
import { CompanyRepository } from '../company/company.repository';
import { verificationService } from '../verification/verification.service';
import { EmployeeRepository } from '../employee/employee.repository';
import { extractEmailDomain, extractDomain } from '../../utils/domain';

export class AuthService extends BaseService {
  constructor(private authRepository: AuthRepository) {
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

  /**
   * Register company with admin user
   * Handles company creation, verification logic, and admin user creation
   */
  async registerCompanyWithAdmin(data: {
    companyName: string;
    website: string;
    domain: string;
    adminEmail: string;
    adminFirstName: string;
    adminLastName: string;
    password: string;
    countryOrRegion?: string;
    acceptedTerms?: boolean;
  }): Promise<{
    company: Company;
    user: User;
    verificationRequired: boolean;
    verificationMethod: VerificationMethod;
  }> {
    const normalizedEmail = normalizeEmail(data.adminEmail);
    const normalizedDomain = extractDomain(data.website);

    // Check if email already exists
    const existingUser = await this.authRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new HttpException(409, 'An account with this email already exists');
    }

    // Create company via CompanyService
    const companyRepository = new CompanyRepository();
    const companyService = new CompanyService(companyRepository);

    const company = await companyService.createCompany({
      name: data.companyName,
      website: data.website,
      domain: normalizedDomain,
      countryOrRegion: data.countryOrRegion,
      acceptedTerms: data.acceptedTerms,
      verificationStatus: 'PENDING',
    });

    // Determine verification method (domain check vs email verification)
    const emailDomain = extractEmailDomain(normalizedEmail);
    const domainMatches = normalizedDomain.toLowerCase() === emailDomain.toLowerCase();

    let verificationMethod: VerificationMethod;
    let userStatus: UserStatus;

    if (domainMatches) {
      // Auto-verify company
      verificationMethod = VerificationMethod.EMAIL_DOMAIN_CHECK;
      await verificationService.verifyByEmailDomain(company, normalizedEmail);
      userStatus = UserStatus.ACTIVE;
    } else {
      // Require email verification
      verificationMethod = VerificationMethod.VERIFICATION_EMAIL;
      await verificationService.initiateEmailVerification(company, normalizedEmail);
      userStatus = UserStatus.PENDING_VERIFICATION;
    }

    // Create admin user
    const adminName = `${data.adminFirstName} ${data.adminLastName}`.trim();
    const user = await this.registerCompanyAdmin(
      company.id,
      normalizedEmail,
      adminName,
      data.password,
      domainMatches // activate if domain matches
    );

    // Create company profile
    await companyService.getProfile(company.id);

    return {
      company,
      user,
      verificationRequired: !domainMatches,
      verificationMethod,
    };
  }

  /**
   * Register employee via auto-join (email domain matching)
   * Finds company by email domain and creates employee user
   */
  async registerEmployeeAutoJoin(
    email: string,
    name: string,
    password: string
  ): Promise<User | null> {
    const normalizedEmail = normalizeEmail(email);

    // Check if email already exists
    const existingUser = await this.authRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new HttpException(409, 'An account with this email already exists');
    }

    // Extract email domain
    const emailDomain = extractEmailDomain(normalizedEmail);

    // Find company by domain
    const companyRepository = new CompanyRepository();
    const company = await companyRepository.findByDomain(emailDomain);

    if (!company) {
      return null; // No company found for this domain
    }

    // Check if company is verified
    if (company.verification_status !== 'VERIFIED') {
      throw new HttpException(403, 'Company must be verified before employees can auto-join');
    }

    // Create employee user
    const user = await this.registerEmployee(company.id, normalizedEmail, name, password);

    return user;
  }

  /**
   * Accept employee invitation
   * Validates invitation token and creates employee user
   */
  async acceptInvitation(
    token: string,
    password: string,
    name: string
  ): Promise<User> {
    const employeeRepository = new EmployeeRepository();

    // Find invitation by token
    const invitation = await employeeRepository.findInvitationByToken(token);

    if (!invitation) {
      throw new HttpException(404, 'Invitation not found');
    }

    // Validate invitation
    if (invitation.status !== 'PENDING') {
      throw new HttpException(400, 'This invitation has already been used or cancelled');
    }

    if (invitation.expires_at < new Date()) {
      throw new HttpException(400, 'This invitation has expired');
    }

    // Check if user already exists
    const existingUser = await this.authRepository.findByEmail(normalizeEmail(invitation.email));
    if (existingUser) {
      throw new HttpException(409, 'An account with this email already exists');
    }

    // Create employee user
    const user = await this.registerEmployee(
      invitation.company_id,
      invitation.email,
      name,
      password
    );

    // Mark invitation as accepted
    await employeeRepository.acceptInvitation(invitation.id);

    return user;
  }
}
