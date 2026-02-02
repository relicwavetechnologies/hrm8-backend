import { getBaseEmailLayout } from './base.template';

export const getVerificationEmailTemplate = (data: { name: string; verificationUrl: string }): string => {
    const content = `
    <p>Hello ${data.name},</p>
    <p>Thank you for signing up! To complete your registration and verify your email address, please click the button below:</p>
    <div style="text-align: center;">
      <a href="${data.verificationUrl}" class="button">Verify Email</a>
    </div>
    <p>Or paste this link into your browser:</p>
    <p style="word-break: break-all; font-size: 14px; background: #f1f5f9; padding: 10px; border-radius: 4px;">${data.verificationUrl}</p>
    <p>This link will expire in 24 hours.</p>
  `;
    return getBaseEmailLayout('Verify Your Email', content);
};

export const getPasswordResetTemplate = (data: { name: string; resetUrl: string; expiresAt?: Date }): string => {
    const content = `
    <p>Hello ${data.name},</p>
    <p>We received a request to reset your password. Click the button below to choose a new password:</p>
    <div style="text-align: center;">
      <a href="${data.resetUrl}" class="button">Reset Password</a>
    </div>
    ${data.expiresAt ? `<p>This link expires at <strong>${data.expiresAt.toLocaleString()}</strong>.</p>` : ''}
    <p>If you did not request a password reset, you can safely ignore this email.</p>
  `;
    return getBaseEmailLayout('Reset Your Password', content);
};

export const getInvitationEmailTemplate = (data: { companyName: string; invitationUrl: string }): string => {
    const content = `
    <p>Hello,</p>
    <p>You have been invited to join <strong>${data.companyName}</strong> on HRM8.</p>
    <div style="text-align: center;">
      <a href="${data.invitationUrl}" class="button">Accept Invitation</a>
    </div>
    <p>If you were not expecting this invitation, please ignore this email.</p>
  `;
    return getBaseEmailLayout(`Invitation to join ${data.companyName}`, content);
};
