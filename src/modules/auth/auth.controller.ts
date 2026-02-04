import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { getSessionCookieOptions, generateSessionId, getSessionExpiration } from '../../utils/session';
import { AuthenticatedRequest } from '../../types';
import { verificationService } from '../verification/verification.service';

export class AuthController extends BaseController {
  private authService: AuthService;
  private authRepository: AuthRepository;

  constructor() {
    super();
    this.authService = new AuthService(new AuthRepository());
    this.authRepository = new AuthRepository();
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

  verifyCompany = async (req: Request, res: Response) => {
    try {
      const { token, companyId } = req.body as { token?: string; companyId?: string };
      if (!token || !companyId) {
        return this.sendError(res, new Error('Token and companyId are required'));
      }

      const result = await verificationService.verifyByEmailToken(companyId, token);
      if (!result.verified) {
        return this.sendError(res, new Error(result.error || 'Invalid or expired verification token'));
      }

      if (result.email) {
        const user = await this.authRepository.findByEmail(result.email);
        if (user && user.status === 'ACTIVE') {
          const sessionId = generateSessionId();
          const expiresAt = getSessionExpiration(24);

          await this.authRepository.createSession({
            session_id: sessionId,
            user: { connect: { id: user.id } },
            email: user.email,
            expires_at: expiresAt,
            company_id: user.company_id,
            user_role: user.role,
          });

          await this.authRepository.updateLastLogin(user.id);

          res.cookie('sessionId', sessionId, getSessionCookieOptions());

          const { password_hash, ...userData } = user;
          return this.sendSuccess(res, {
            message: 'Company verified successfully. You have been automatically logged in.',
            email: result.email,
            user: {
              ...userData,
              companyId: user.company_id,
            },
          });
        }
      }

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
      const { email } = req.body as { email?: string };
      if (!email) {
        return this.sendError(res, new Error('Email is required'));
      }
      const result = await verificationService.resendVerificationEmail(email);
      return this.sendSuccess(res, {
        message: 'Verification email sent. Please check your inbox.',
        ...result,
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
