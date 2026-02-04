import { BaseService } from '../../core/service';
import { Company } from '../../types';
import { prisma } from '../../utils/prisma';
import { CompanyVerificationStatus, VerificationMethod, UserStatus } from '@prisma/client';
import { generateVerificationToken } from '../../utils/token';
import { emailService } from '../email/email.service';
import { normalizeEmail } from '../../utils/email';

export class VerificationService extends BaseService {
  async verifyByEmailToken(
    companyId: string,
    token: string
  ): Promise<{ verified: boolean; email?: string; error?: string }> {
    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!tokenRecord) {
      return { verified: false, error: 'Invalid verification token' };
    }

    if (tokenRecord.company_id !== companyId) {
      return { verified: false, error: 'Token does not match company' };
    }

    if (tokenRecord.used_at) {
      return { verified: false, error: 'This verification link has already been used' };
    }

    if (tokenRecord.expires_at < new Date()) {
      return { verified: false, error: 'This verification link has expired' };
    }

    await prisma.verificationToken.update({
      where: { id: tokenRecord.id },
      data: { used_at: new Date() },
    });

    await prisma.company.update({
      where: { id: companyId },
      data: {
        verification_status: CompanyVerificationStatus.VERIFIED,
        verification_method: VerificationMethod.VERIFICATION_EMAIL,
        verified_at: new Date(),
      },
    });

    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(tokenRecord.email) },
    });

    if (user && user.status !== UserStatus.ACTIVE) {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.ACTIVE },
      });
    }

    return { verified: true, email: tokenRecord.email };
  }

  async resendVerificationEmail(email: string): Promise<any> {
    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { company: true },
    });

    if (!user || !user.company) {
      throw new Error('No account found for this email address.');
    }

    const token = generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.verificationToken.create({
      data: {
        company: { connect: { id: user.company.id } },
        email: normalizedEmail,
        token,
        expires_at: expiresAt,
      },
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const invitationUrl = `${baseUrl}/verify-company?token=${token}&companyId=${user.company.id}`;

    await emailService.sendInvitationEmail({
      to: normalizedEmail,
      companyName: user.company.name,
      invitationUrl,
    });

    return { email: normalizedEmail, companyId: user.company.id, expiresAt };
  }

  async initiateEmailVerification(company: Company, email: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const token = generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.verificationToken.create({
      data: {
        company: { connect: { id: company.id } },
        email: normalizedEmail,
        token,
        expires_at: expiresAt,
      },
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const invitationUrl = `${baseUrl}/verify-company?token=${token}&companyId=${company.id}`;

    await emailService.sendInvitationEmail({
      to: normalizedEmail,
      companyName: company.name,
      invitationUrl,
    });
  }

  async initiateManualVerification(companyId: string, data: any): Promise<void> {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        verification_method: VerificationMethod.MANUAL_VERIFICATION,
      },
    });
  }
}

export const verificationService = new VerificationService();
