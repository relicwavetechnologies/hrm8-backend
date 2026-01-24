import { BaseService } from '../../core/service';

export class InvitationService extends BaseService {
  async findByToken(token: string): Promise<any> {
    throw new Error('Method not implemented.');
  }
  
  isInvitationValid(invitation: any): boolean {
     throw new Error('Method not implemented.');
  }

  async acceptInvitation(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

export const invitationService = new InvitationService();
