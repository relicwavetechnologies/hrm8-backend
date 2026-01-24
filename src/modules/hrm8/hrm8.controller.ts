import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { Hrm8Service } from './hrm8.service';
import { Hrm8Repository } from './hrm8.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { getSessionCookieOptions } from '../../utils/session';

export class Hrm8Controller extends BaseController {
  private hrm8Service: Hrm8Service;

  constructor() {
    super();
    this.hrm8Service = new Hrm8Service(new Hrm8Repository());
  }

  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const { user, sessionId, regionIds } = await this.hrm8Service.login({ email, password });
      
      res.cookie('hrm8SessionId', sessionId, getSessionCookieOptions());
      
      const { password_hash, ...userData } = user;
      return this.sendSuccess(res, { 
        hrm8User: { ...userData, regionIds } 
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  logout = async (req: Request, res: Response) => {
    try {
      const sessionId = req.cookies?.hrm8SessionId;
      if (sessionId) {
        await this.hrm8Service.logout(sessionId);
      }
      res.clearCookie('hrm8SessionId', getSessionCookieOptions());
      return this.sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getCurrentUser = async (req: Hrm8AuthenticatedRequest, res: Response) => {
    try {
      if (!req.hrm8User) return this.sendError(res, new Error('Not authenticated'));
      const { user, regionIds } = await this.hrm8Service.getProfile(req.hrm8User.id);
      const { password_hash, ...userData } = user;
      return this.sendSuccess(res, { 
        hrm8User: { ...userData, regionIds } 
      });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  changePassword = async (req: Hrm8AuthenticatedRequest, res: Response) => {
    try {
      if (!req.hrm8User) return this.sendError(res, new Error('Not authenticated'));
      const { currentPassword, newPassword } = req.body;
      await this.hrm8Service.changePassword(req.hrm8User.id, currentPassword, newPassword);
      return this.sendSuccess(res, { message: 'Password changed successfully' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
