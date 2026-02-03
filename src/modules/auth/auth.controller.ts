import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { getSessionCookieOptions } from '../../utils/session';
import { AuthenticatedRequest } from '../../types';

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor() {
    super();
    this.authService = new AuthService(new AuthRepository());
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
}
