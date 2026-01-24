import { BaseService } from '../../core/service';
import { Company } from '../../types';

export class VerificationService extends BaseService {
  async verifyByEmailToken(companyId: string, token: string): Promise<boolean> {
    // Stub
    return true;
  }

  async resendVerificationEmail(email: string): Promise<any> {
    // Stub
    return {};
  }

  async initiateEmailVerification(company: Company, email: string): Promise<void> {
    // Stub
  }

  async initiateManualVerification(companyId: string, data: any): Promise<void> {
    // Stub
  }
}

export const verificationService = new VerificationService();
