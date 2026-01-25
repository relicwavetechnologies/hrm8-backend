import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { WalletService } from './wallet.service';
import { AuthenticatedRequest } from '../../types';
import { VirtualAccountOwner } from '@prisma/client';

export class WalletController extends BaseController {
  
  private getOwnerInfo(req: AuthenticatedRequest) {
    const user = req.user;
    if (!user) throw new Error('Unauthorized');

    let ownerType: VirtualAccountOwner;
    let ownerId: string;

    // Use type field (set in auth middleware based on companyId presence)
    // This matches the old backend behavior
    if (user.type === 'COMPANY' && user.companyId) {
        // Company user (including SUPER_ADMIN with company) sees Company Wallet
        ownerType = 'COMPANY';
        ownerId = user.companyId;
    } else if (user.type === 'CONSULTANT') {
        // Consultant sees their own wallet
        ownerType = 'CONSULTANT';
        ownerId = user.id;
    } else if (user.role === 'SUPER_ADMIN' && !user.companyId) {
        // Platform Admin without company sees Global Wallet
        ownerType = 'HRM8_GLOBAL';
        ownerId = 'global';
    } else {
        // Fallback based on companyId
        if (user.companyId) {
            ownerType = 'COMPANY';
            ownerId = user.companyId;
        } else {
            ownerType = 'CONSULTANT';
            ownerId = user.id;
        }
    }

    return { ownerType, ownerId };
  }

  getAccount = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const account = await WalletService.getOrCreateAccount(ownerType, ownerId);
      return this.sendSuccess(res, { account });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getBalance = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const balance = await WalletService.getBalance(ownerType, ownerId);
      return this.sendSuccess(res, { ...balance }); // Flatten { balance, currency, status }
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getTransactions = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const result = await WalletService.getTransactions(ownerType, ownerId, { limit, offset });
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
