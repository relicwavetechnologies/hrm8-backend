import { Response } from 'express';
import { Hrm8AuthenticatedRequest } from '../../types';
import { env } from '../../config/env';

export class MessagingController {
  getProviders = async (_req: Hrm8AuthenticatedRequest, res: Response) => {
    const configured = Boolean(env.SMTP_HOST && env.SMTP_USER);

    res.json({
      success: true,
      data: {
        providers: [
          {
            provider: 'smtp',
            name: 'SMTP',
            configured,
            smtp_host: env.SMTP_HOST || null,
            smtp_port: env.SMTP_PORT || null,
            smtp_secure: env.SMTP_SECURE === 'true',
            smtp_from: env.SMTP_FROM || null,
          },
        ],
      },
    });
  };
}
