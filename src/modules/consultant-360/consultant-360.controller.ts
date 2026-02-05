import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { consultant360Service } from './consultant-360.service';
import { consultantService } from '../consultant/consultant.service';
import { ConsultantAuthenticatedRequest } from '../../types';

export class Consultant360Controller extends BaseController {
    constructor() {
        super('consultant-360');
    }

    getUnifiedDashboard = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            const dashboard = await consultant360Service.getUnifiedDashboard(req.consultant.id);
            return this.sendSuccess(res, dashboard);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getLeads = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            const { page, limit, status, search } = req.query;
            const result = await consultant360Service.getLeads(req.consultant.id, {
                page: Number(page),
                limit: Number(limit),
                status: status as any,
                search: search as string
            });
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    createLead = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            const lead = await consultant360Service.createLead(req.consultant.id, req.body);
            return this.sendSuccess(res, lead);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    submitConversionRequest = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            const { id } = req.params as { id: string };
            const request = await consultant360Service.submitConversionRequest(req.consultant.id, id, req.body);
            return this.sendSuccess(res, request);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getUnifiedEarnings = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            const earnings = await consultant360Service.getUnifiedEarnings(req.consultant.id);
            return this.sendSuccess(res, earnings);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getUnifiedCommissions = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            // Reusing consultant service for detailed list
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            // Note: This endpoint might filter specifically for 360-related commissions if needed
            // For now, returning all commissions
            const commissions = await consultantService.getCommissions(req.consultant.id, req.query);
            return this.sendSuccess(res, commissions);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getUnifiedBalance = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            const balance = await consultant360Service.getUnifiedBalance(req.consultant.id);
            return this.sendSuccess(res, balance);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    requestWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            const withdrawal = await consultantService.requestWithdrawal(req.consultant.id, req.body);
            return this.sendSuccess(res, withdrawal);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getWithdrawals = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            const withdrawals = await consultantService.getWithdrawals(req.consultant.id);
            return this.sendSuccess(res, withdrawals);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    stripeOnboard = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            const result = await consultantService.onboardStripe(req.consultant.id);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getStripeStatus = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            const result = await consultantService.getStripeStatus(req.consultant.id);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    getStripeLoginLink = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            const result = await consultantService.getStripeLoginLink(req.consultant.id);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    cancelWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            const { id } = req.params as { id: string };
            const result = await consultantService.cancelWithdrawal(req.consultant.id, id);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

    executeWithdrawal = async (req: ConsultantAuthenticatedRequest, res: Response) => {
        try {
            if (!req.consultant) return this.sendError(res, new Error('Not authenticated'));
            const { id } = req.params as { id: string };
            const result = await consultantService.executeWithdrawal(req.consultant.id, id);
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    };

}
