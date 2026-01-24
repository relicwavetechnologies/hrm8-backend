import { Response, Request } from 'express';
import { BaseController } from '../../core/controller';
import { communicationService } from './communication.service';
import { AuthenticatedRequest } from '../../types';

export class CommunicationController extends BaseController {
  
  // Example endpoint to trigger a test email (Admin only)
  sendTestEmail = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        return this.sendError(res, new Error('Unauthorized'));
      }
      
      const { to } = req.body;
      await communicationService.sendEmail(to, 'Test Email', '<h1>Test</h1><p>This is a test email.</p>');
      
      return this.sendSuccess(res, { message: 'Test email sent' });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
