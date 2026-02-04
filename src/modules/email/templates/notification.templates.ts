import { getBaseEmailLayout } from './base.template';

export const getNotificationEmailTemplate = (data: { title: string; message: string; actionUrl?: string }): string => {
    const content = `
    <p>${data.message}</p>
    ${data.actionUrl ? `
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${data.actionUrl}" class="button">View Details</a>
      </div>
    ` : ''}
  `;
    return getBaseEmailLayout(data.title, content);
};
