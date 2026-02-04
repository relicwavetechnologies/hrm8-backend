import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { prisma } from '../../utils/prisma';
import { EmailTemplateService } from '../email/email-template.service';

export class RoundConfigController {
    /**
     * Update email configuration for a specific job round
     */
    static async updateEmailConfig(req: AuthenticatedRequest, res: Response) {
        try {
            const { jobId, roundId } = req.params as { jobId: string; roundId: string };
            const { enabled, templateId } = req.body;

            // 1. Verify Round Exists & Access Control
            const round = await prisma.jobRound.findUnique({
                where: { id: roundId },
                include: { job: true }
            }) as any; // Cast to any to access job relation and new fields if types aren't regenerated

            if (!round) {
                return res.status(404).json({ success: false, message: 'Round not found' });
            }

            // Ensure user belongs to the company owning the job
            if (round.job?.company_id !== req.user?.companyId) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            // 2. Validation Logic
            if (enabled && templateId) {
                const template = await EmailTemplateService.findOne(templateId);
                // ... validation logic ...
            }

            // 3. Update Configuration
            const updatedRound = await prisma.jobRound.update({
                where: { id: roundId },
                data: {
                    email_config: {
                        enabled: Boolean(enabled),
                        templateId: templateId || null
                    }
                }
            });

            res.json({ success: true, data: updatedRound.email_config });
        } catch (error) {
            console.error('Update Round Email Config Error:', error);
            res.status(500).json({ success: false, message: 'Failed to update configuration' });
        }
    }

    static async getEmailConfig(req: AuthenticatedRequest, res: Response) {
        try {
            const { roundId } = req.params as { roundId: string };
            const round = await prisma.jobRound.findUnique({
                where: { id: roundId },
                select: { email_config: true }
            }) as any;

            if (!round) {
                return res.status(404).json({ success: false, message: 'Round not found' });
            }

            res.json({ success: true, data: round.email_config || { enabled: false } });
        } catch (error) {
            console.error('Get Round Email Config Error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch configuration' });
        }
    }
}
