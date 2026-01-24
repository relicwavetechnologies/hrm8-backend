import { BaseService } from '../../core/service';

export class HiringTeamInvitationService extends BaseService {
  async inviteToHiringTeam(companyId: string, jobId: string, jobTitle: string, inviterId: string, data: any): Promise<void> {
    // Stub
  }
}

export const hiringTeamInvitationService = new HiringTeamInvitationService();
