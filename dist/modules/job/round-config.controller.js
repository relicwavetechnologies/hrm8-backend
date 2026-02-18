"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoundConfigController = void 0;
const prisma_1 = require("../../utils/prisma");
const email_template_service_1 = require("../email/email-template.service");
class RoundConfigController {
    /**
     * Update email configuration for a specific job round
     */
    static async updateEmailConfig(req, res) {
        try {
            const { jobId, roundId } = req.params;
            const { enabled, templateId } = req.body;
            // 1. Verify Round Exists & Access Control
            const round = await prisma_1.prisma.jobRound.findUnique({
                where: { id: roundId },
                include: { job: true }
            }); // Cast to any to access job relation and new fields if types aren't regenerated
            if (!round) {
                return res.status(404).json({ success: false, message: 'Round not found' });
            }
            // Ensure user belongs to the company owning the job
            if (round.job?.company_id !== req.user?.companyId) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
            // 2. Validation Logic
            if (enabled && templateId) {
                const template = await email_template_service_1.EmailTemplateService.findOne(templateId);
                // ... validation logic ...
            }
            // 3. Update Configuration
            const updatedRound = await prisma_1.prisma.jobRound.update({
                where: { id: roundId },
                data: {
                    email_config: {
                        enabled: Boolean(enabled),
                        templateId: templateId || null
                    }
                }
            });
            res.json({ success: true, data: updatedRound.email_config });
        }
        catch (error) {
            console.error('Update Round Email Config Error:', error);
            res.status(500).json({ success: false, message: 'Failed to update configuration' });
        }
    }
    static async getEmailConfig(req, res) {
        try {
            const { roundId } = req.params;
            const round = await prisma_1.prisma.jobRound.findUnique({
                where: { id: roundId },
                select: { email_config: true }
            });
            if (!round) {
                return res.status(404).json({ success: false, message: 'Round not found' });
            }
            res.json({ success: true, data: round.email_config || { enabled: false } });
        }
        catch (error) {
            console.error('Get Round Email Config Error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch configuration' });
        }
    }
    /**
     * Get offer configuration for a job round (OFFER round only)
     */
    static async getOfferConfig(req, res) {
        try {
            const { jobId, roundId } = req.params;
            const round = await prisma_1.prisma.jobRound.findUnique({
                where: { id: roundId },
                include: { job: true }
            });
            if (!round) {
                return res.status(404).json({ success: false, message: 'Round not found' });
            }
            if (round.job_id !== jobId) {
                return res.status(400).json({ success: false, message: 'Round does not belong to job' });
            }
            if (round.job?.company_id !== req.user?.companyId) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
            const config = round.offer_config || {};
            res.json({ success: true, data: config });
        }
        catch (error) {
            console.error('Get Offer Config Error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch configuration' });
        }
    }
    /**
     * Update offer configuration for a job round (OFFER round only)
     */
    static async updateOfferConfig(req, res) {
        try {
            const { jobId, roundId } = req.params;
            const body = req.body;
            const round = await prisma_1.prisma.jobRound.findUnique({
                where: { id: roundId },
                include: { job: true }
            });
            if (!round) {
                return res.status(404).json({ success: false, message: 'Round not found' });
            }
            if (round.job_id !== jobId) {
                return res.status(400).json({ success: false, message: 'Round does not belong to job' });
            }
            if (round.job?.company_id !== req.user?.companyId) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
            const offerConfig = {
                autoSend: Boolean(body.autoSend),
                defaultTemplateId: body.defaultTemplateId || null,
                defaultSalary: body.defaultSalary ?? '',
                defaultSalaryCurrency: body.defaultSalaryCurrency || 'USD',
                defaultSalaryPeriod: body.defaultSalaryPeriod || 'annual',
                defaultWorkLocation: body.defaultWorkLocation ?? '',
                defaultWorkArrangement: body.defaultWorkArrangement || 'remote',
                defaultBenefits: body.defaultBenefits ?? '',
                defaultVacationDays: body.defaultVacationDays ?? '',
                defaultExpiryDays: body.defaultExpiryDays ?? '7',
                defaultCustomMessage: body.defaultCustomMessage ?? '',
            };
            const updated = await prisma_1.prisma.jobRound.update({
                where: { id: roundId },
                data: { offer_config: offerConfig }
            });
            res.json({ success: true, data: updated.offer_config });
        }
        catch (error) {
            console.error('Update Offer Config Error:', error);
            res.status(500).json({ success: false, message: 'Failed to update configuration' });
        }
    }
}
exports.RoundConfigController = RoundConfigController;
