import { BaseService } from '../../core/service';

export class EmailService extends BaseService {
  async sendPasswordResetEmail(data: any) {
    throw new Error('Method not implemented.');
  }

  async sendPasswordChangeConfirmation(data: any) {
    throw new Error('Method not implemented.');
  }

  async sendCandidateVerificationEmail(data: { to: string; name: string; verificationUrl: string }) {
    console.log(`[EmailService] Sending verification email to ${data.to}: ${data.verificationUrl}`);
    return true;
  }
}

export const emailService = new EmailService();
