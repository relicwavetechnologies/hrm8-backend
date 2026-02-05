import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';
import { AuthenticatedRequest } from '../../types';
import { VirtualAccountOwner } from '@prisma/client';

export class WalletController extends BaseController {
  private walletService: WalletService;

  constructor() {
    super();
    this.walletService = new WalletService(new WalletRepository());
  }

  private getOwnerInfo(req: AuthenticatedRequest) {
    const user = req.user;
    if (!user) throw new Error('Unauthorized');

    let ownerType: VirtualAccountOwner;
    let ownerId: string;

    if (user.type === 'COMPANY' && user.companyId) {
      ownerType = 'COMPANY';
      ownerId = user.companyId;
    } else if (user.type === 'CONSULTANT') {
      ownerType = 'CONSULTANT';
      ownerId = user.id;
    } else if (user.role === 'SUPER_ADMIN' && !user.companyId) {
      ownerType = 'HRM8_GLOBAL';
      ownerId = 'global';
    } else {
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
      const account = await this.walletService.getOrCreateAccount(ownerType, ownerId);
      return this.sendSuccess(res, { account });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getBalance = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const balance = await this.walletService.getBalance(ownerType, ownerId);
      return this.sendSuccess(res, balance);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getTransactions = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.walletService.getTransactions(ownerType, ownerId, { limit, offset });
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getTransaction = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const transaction = await this.walletService.getTransactionById(ownerType, ownerId, req.params.transactionId as string);
      return this.sendSuccess(res, transaction);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  verifyWallet = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const result = await this.walletService.verifyWalletIntegrity(ownerType, ownerId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  requestWithdrawal = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const { amount, description } = req.body;
      const result = await this.walletService.requestWithdrawal(ownerType, ownerId, amount, description);
      return this.sendSuccess(res, result, 'Withdrawal request submitted');
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
