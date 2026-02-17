import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { CompanyRepository } from '../company/company.repository';
import { getSessionCookieOptions } from '../../utils/session';
import { AuthenticatedRequest } from '../../types';
import { passwordResetService } from './password-reset.service';

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

      const { password_hash, ...userData } = user;
      return this.sendSuccess(res, {
        user: {
          ...userData,
          companyId: user.company_id
        }
      });
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
      const result = await this.authService.signup(req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  registerCompany = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.registerCompany(req.body);
      return this.sendSuccess(res, result);
    } catch (error) {
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
      const result = await this.authService.resendVerification(email);
      return this.sendSuccess(res, result);
    } catch (error) {
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
