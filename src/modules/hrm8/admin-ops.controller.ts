import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { AdminOpsRepository } from './admin-ops.repository';
import { LeadConversionService } from '../sales/lead-conversion.service';
import { LeadConversionRepository } from '../sales/lead-conversion.repository';
import { SalesRepository } from '../sales/sales.repository';
import { AuthService } from '../auth/auth.service';
import { AuthRepository } from '../auth/auth.repository';
import { CompanyService } from '../company/company.service';
import { CompanyRepository } from '../company/company.repository';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';
import { Hrm8AuthenticatedRequest } from '../../types';
import { ConversionRequestStatus } from '@prisma/client';

export class AdminOpsController extends BaseController {
    private repo: AdminOpsRepository;
    private leadConversionService: LeadConversionService;

    constructor() {
        super('hrm8-ops');
        this.repo = new AdminOpsRepository();
        const salesRepo = new SalesRepository();
        this.leadConversionService = new LeadConversionService(
            new LeadConversionRepository(),
            salesRepo,
            new AuthService(new AuthRepository()),
            new CompanyService(new CompanyRepository()),
            new NotificationService(new NotificationRepository())
        );
    }

    // --- Refund Requests ---
    getRefundRequests = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const result = await this.repo.getRefundRequests();
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    approveRefund = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const hrm8User = req.hrm8User;
            if (!hrm8User) return this.sendError(res, new Error('HRM8 User not found'), 401);

            const result = await this.repo.approveRefund(
                req.params.id as string,
                hrm8User.id,
                req.body.adminNotes
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    // --- Lead Conversion ---
    getConversionRequests = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const status = req.query.status as string;
            const regionIds = req.assignedRegionIds; // Specific to regional admins if applicable
            const result = await this.leadConversionService.getAllRequests({
                status: status as ConversionRequestStatus,
                regionIds
            });
            return this.sendSuccess(res, { requests: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    approveConversion = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const hrm8User = req.hrm8User;
            if (!hrm8User) return this.sendError(res, new Error('HRM8 User not found'), 401);

            const result = await this.leadConversionService.approveRequest(
                req.params.id as string,
                hrm8User.id,
                req.body.adminNotes
            );
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    declineConversion = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const hrm8User = req.hrm8User;
            if (!hrm8User) return this.sendError(res, new Error('HRM8 User not found'), 401);

            if (!req.body.declineReason) return this.sendError(res, new Error('Decline reason is required'), 400);

            const result = await this.leadConversionService.declineRequest(
                req.params.id as string,
                hrm8User.id,
                req.body.declineReason
            );
            return this.sendSuccess(res, { request: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    // --- Withdrawals ---
    getWithdrawalRequests = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const status = req.query.status as string;
            const result = await this.repo.getWithdrawalRequests(status);
            return this.sendSuccess(res, { withdrawals: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    approveWithdrawal = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const hrm8User = req.hrm8User;
            if (!hrm8User) return this.sendError(res, new Error('HRM8 User not found'), 401);

            const result = await this.repo.approveWithdrawal(
                req.params.id as string,
                hrm8User.id,
                req.body.adminNotes,
                req.body.paymentReference
            );
            return this.sendSuccess(res, { withdrawal: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }

    rejectWithdrawal = async (req: Hrm8AuthenticatedRequest, res: Response) => {
        try {
            const hrm8User = req.hrm8User;
            if (!hrm8User) return this.sendError(res, new Error('HRM8 User not found'), 401);

            if (!req.body.reason) return this.sendError(res, new Error('Rejection reason is required'), 400);

            const result = await this.repo.rejectWithdrawal(
                req.params.id as string,
                hrm8User.id,
                req.body.reason
            );
            return this.sendSuccess(res, { withdrawal: result });
        } catch (error) {
            return this.sendError(res, error);
        }
    }
}
