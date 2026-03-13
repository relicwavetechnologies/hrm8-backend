import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { CompanyRepository } from '../company/company.repository';
import { companyProfileService } from '../company/company-profile.service';
import { getSessionCookieOptions } from '../../utils/session';
import { AuthenticatedRequest } from '../../types';
import { passwordResetService } from './password-reset.service';
import type { User } from '@prisma/client';

async function buildCompanyAuthResponse(user: User) {
  const { password_hash, ...userData } = user;
  const base = {
    user: { ...userData, companyId: user.company_id },
  } as Record<string, unknown>;

  if (!user.company_id) return base;

  try {
    const [profile, company] = await Promise.all([
      companyProfileService.getProfileSummary(user.company_id),
      new CompanyRepository().findById(user.company_id),
    ]);
    const requiresCurrencySetup =
      company?.currency_preference_confirmed_at == null && company?.currency_locked_at == null;
    (base as any).profile = profile;
    (base as any).requiresCurrencySetup = requiresCurrencySetup;
    (base as any).billingCurrency = company?.billing_currency ?? 'USD';
  } catch {
    // Fallback if profile/company fetch fails
  }
  return base;
}

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor() {
    super();
    this.authService = new AuthService(new AuthRepository(), new CompanyRepository());
  }

  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      console.log(`[AuthController.login] Login attempt for email: ${email}`);

      const { user, sessionId } = await this.authService.login({ email, password });

      console.log(`[AuthController.login] Login successful, setting sessionId: ${sessionId}`);
      const cookieOptions = getSessionCookieOptions();
      console.log(`[AuthController.login] Cookie options:`, cookieOptions);

      res.cookie('sessionId', sessionId, cookieOptions);

      const payload = await buildCompanyAuthResponse(user);
      return this.sendSuccess(res, payload);
    } catch (error) {
      console.error(`[AuthController.login] Login error:`, error);
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
      const payload = await buildCompanyAuthResponse(user);
      return this.sendSuccess(res, payload);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  acceptLeadConversionInvite = async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return this.sendError(res, new Error('Token and password are required'));
      }

      const user = await passwordResetService.acceptLeadConversionInvite(token, password);
      const { sessionId } = await this.authService.createSessionForUser(user);

      const cookieOptions = getSessionCookieOptions();
      res.cookie('sessionId', sessionId, cookieOptions);

      const { password_hash, ...userData } = user;
      return this.sendSuccess(res, {
        user: { ...userData, companyId: user.company_id }
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  signup = async (req: Request, res: Response) => {
    try {
      console.log('[AuthController.signup] Incoming request', {
        businessEmail: req.body?.businessEmail,
        companyDomain: req.body?.companyDomain,
      });
      const result = await this.authService.signup(req.body);
      console.log('[AuthController.signup] Success', {
        requestId: (result as any)?.requestId,
      });
      return this.sendSuccess(res, result);
    } catch (error) {
      console.error('[AuthController.signup] Failed', {
        error: error instanceof Error ? error.message : String(error),
        businessEmail: req.body?.businessEmail,
        companyDomain: req.body?.companyDomain,
      });
      return this.sendError(res, error);
    }
  };

  registerCompany = async (req: Request, res: Response) => {
    try {
      console.log('[AuthController.registerCompany] Incoming request', {
        adminEmail: req.body?.adminEmail,
        companyWebsite: req.body?.companyWebsite,
      });
      const result = await this.authService.registerCompany(req.body);
      console.log('[AuthController.registerCompany] Success', {
        companyId: (result as any)?.companyId,
        adminUserId: (result as any)?.adminUserId,
      });
      return this.sendSuccess(res, result);
    } catch (error) {
      console.error('[AuthController.registerCompany] Failed', {
        error: error instanceof Error ? error.message : String(error),
        adminEmail: req.body?.adminEmail,
        companyWebsite: req.body?.companyWebsite,
      });
      return this.sendError(res, error);
    }
  };

  verifyCompany = async (req: Request, res: Response) => {
    try {
      const { token, companyId } = req.body;
      const result = await this.authService.verifyCompany(token, companyId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  resendVerification = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      console.log('[AuthController.resendVerification] Incoming request', { email });
      const result = await this.authService.resendVerification(email);
      console.log('[AuthController.resendVerification] Success', {
        email: (result as any)?.email,
        companyId: (result as any)?.companyId,
      });
      return this.sendSuccess(res, result);
    } catch (error) {
      console.error('[AuthController.resendVerification] Failed', {
        error: error instanceof Error ? error.message : String(error),
        email: req.body?.email,
      });
      return this.sendError(res, error);
    }
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      await passwordResetService.requestPasswordReset(email, {
        ip: req.ip as string,
        userAgent: req.get('user-agent'),
      });
      return this.sendSuccess(res, { message: 'If an account exists with that email, a password reset link has been sent.' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      await passwordResetService.resetPassword(token, password);
      return this.sendSuccess(res, { message: 'Password reset successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
