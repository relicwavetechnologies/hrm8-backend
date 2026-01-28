import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { getSessionCookieOptions, generateSessionId, getSessionExpiration } from '../../utils/session';
import { AuthenticatedRequest } from '../../types';
import { verificationService } from '../verification/verification.service';
import { passwordResetService } from './password-reset.service';
import { signupRequestService } from './signup-request.service';
import { CompanyService } from '../company/company.service';
import { CompanyRepository } from '../company/company.repository';

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor() {
    super();
    this.authService = new AuthService(new AuthRepository());
  }

  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const { user, sessionId } = await this.authService.login({ email, password });

      res.cookie('sessionId', sessionId, getSessionCookieOptions());

      const { password_hash, ...userData } = user;
      return this.sendSuccess(res, {
        user: {
          ...userData,
          companyId: user.company_id
        }
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  logout = async (req: Request, res: Response) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (sessionId) {
        await this.authService.logout(sessionId);
      }
      res.clearCookie('sessionId', getSessionCookieOptions());
      return this.sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Not authenticated'));
      const user = await this.authService.getCurrentUser(req.user.id);
      const { password_hash, ...userData } = user;

      // Get company profile to match old backend behavior
      const companyService = new CompanyService(new CompanyRepository());
      const profile = await companyService.getProfile(user.company_id);

      return this.sendSuccess(res, {
        user: {
          ...userData,
          companyId: user.company_id
        },
        profile
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  registerCompany = async (req: Request, res: Response) => {
    try {
      const {
        companyName,
        website,
        domain,
        adminEmail,
        adminFirstName,
        adminLastName,
        password,
        countryOrRegion,
        acceptedTerms,
      } = req.body;

      const result = await this.authService.registerCompanyWithAdmin({
        companyName,
        website,
        domain,
        adminEmail,
        adminFirstName,
        adminLastName,
        password,
        countryOrRegion,
        acceptedTerms,
      });

      res.status(201);
      return this.sendSuccess(res, {
        companyId: result.company.id,
        adminUserId: result.user.id,
        verificationRequired: result.verificationRequired,
        verificationMethod: result.verificationMethod,
        message: result.verificationRequired
          ? 'Company registered. Please verify your email to activate your account.'
          : 'Company registered and verified successfully.',
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  registerEmployee = async (req: Request, res: Response) => {
    try {
      const { email, name, password } = req.body;

      const user = await this.authService.registerEmployeeAutoJoin(email, name, password);

      if (!user) {
        return this.sendError(res, new Error('No company found for this email domain. Please contact your company admin for an invitation.'));
      }

      res.status(201);
      return this.sendSuccess(res, {
        userId: user.id,
        message: 'Account created successfully. You can now login.',
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  acceptInvitation = async (req: Request, res: Response) => {
    try {
      const { token, password, name } = req.body;

      const user = await this.authService.acceptInvitation(token, password, name);

      res.status(201);
      return this.sendSuccess(res, {
        userId: user.id,
        message: 'Account created successfully. You can now login.',
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  verifyCompany = async (req: Request, res: Response) => {
    try {
      const { token, companyId } = req.body;

      if (!token || !companyId) {
        return this.sendError(res, new Error('Token and companyId are required'));
      }

      const result = await verificationService.verifyByEmailToken(companyId, token);

      if (!result.verified) {
        return this.sendError(res, new Error(result.error || 'Invalid or expired verification token'));
      }

      // After successful verification, automatically create a session for the user
      if (result.email) {
        const authRepository = new AuthRepository();
        const user = await authRepository.findByEmail(result.email);

        if (user && user.status === 'ACTIVE') {
          // Generate session
          const sessionId = generateSessionId();
          const expiresAt = getSessionExpiration();

          await authRepository.createSession({
            session_id: sessionId,
            user: { connect: { id: user.id } },
            email: user.email,
            expires_at: expiresAt,
            company_id: user.company_id,
            user_role: user.role,
          });

          // Update last login
          await authRepository.updateLastLogin(user.id);

          // Set session cookie
          res.cookie('sessionId', sessionId, getSessionCookieOptions());

          // Get company details
          const companyRepository = new CompanyRepository();
          const companyService = new CompanyService(companyRepository);
          const company = await companyService.getCompany(user.company_id);
          const profile = await companyService.getProfile(user.company_id);

          const { password_hash, ...userData } = user;

          return this.sendSuccess(res, {
            message: 'Company verified successfully. You have been automatically logged in.',
            email: result.email,
            user: {
              ...userData,
              companyId: user.company_id,
              companyName: company.name,
              companyWebsite: company.website,
              companyDomain: company.domain,
            },
            profile,
          });
        }
      }

      // Fallback: verification succeeded but couldn't create session
      return this.sendSuccess(res, {
        message: 'Company verified successfully. You can now login.',
        email: result.email,
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  resendVerification = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      const result = await verificationService.resendVerificationEmail(email);

      return this.sendSuccess(res, {
        message: 'Verification email sent. Please check your inbox.',
        ...result,
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  requestPasswordReset = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      await passwordResetService.requestPasswordReset(email, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Generic message to prevent account enumeration
      return this.sendSuccess(res, {
        message: 'If an account exists for that email, we sent a password reset link.',
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      await passwordResetService.resetPassword(token, password);

      return this.sendSuccess(res, {
        message: 'Password updated successfully. You can now log in.',
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createSignupRequest = async (req: Request, res: Response) => {
    try {
      const { companyId, email, name, firstName, lastName, password, acceptedTerms } = req.body;

      await signupRequestService.createSignupRequest({
        companyId,
        email,
        name,
        firstName,
        lastName,
        password,
        acceptedTerms,
      });

      res.status(201);
      return this.sendSuccess(res, {
        message: 'Signup request submitted successfully. Your request is pending approval.',
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
