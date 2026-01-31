import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { WalletService } from './wallet.service';
import { AuthenticatedRequest } from '../../types';
import { VirtualAccountOwner } from '@prisma/client';
import { HttpException } from '../../core/http-exception';

export class WalletController extends BaseController {

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

  // Account Management
  getAccount = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const account = await WalletService.getAccount(ownerType, ownerId);
      return this.sendSuccess(res, { account });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  verifyWallet = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const account = await WalletService.verifyWallet(ownerType, ownerId);
      return this.sendSuccess(res, { account, verified: true });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getBalance = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const balance = await WalletService.getBalance(ownerType, ownerId);
      return this.sendSuccess(res, balance);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Transactions
  getTransactions = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const type = req.query.type as string;

      const result = await WalletService.getTransactions(ownerType, ownerId, { limit, offset, type });
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Earnings
  getEarnings = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const earnings = await WalletService.getEarnings(ownerType, ownerId);
      return this.sendSuccess(res, earnings);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Withdrawals
  requestWithdrawal = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const { amount, paymentMethod, paymentDetails, notes } = req.body;

      if (!amount || !paymentMethod) {
        throw new HttpException(400, 'Missing required fields: amount, paymentMethod');
      }

      const withdrawal = await WalletService.requestWithdrawal(ownerType, ownerId, {
        amount,
        paymentMethod,
        paymentDetails,
        notes
      });

      return this.sendSuccess(res, { withdrawal }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getWithdrawalHistory = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;

      const history = await WalletService.getWithdrawalHistory(ownerType, ownerId);
      const filtered = status ? history.filter(w => w.status === status) : history;
      const paginated = filtered.slice(offset, offset + limit);

      return this.sendSuccess(res, { withdrawals: paginated, total: filtered.length, limit, offset });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Refunds
  requestRefund = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const { transactionId, reason, description } = req.body;

      if (!transactionId || !reason) {
        throw new HttpException(400, 'Missing required fields: transactionId, reason');
      }

      const refund = await WalletService.requestRefund(ownerType, ownerId, {
        transactionId,
        reason,
        description
      });

      return this.sendSuccess(res, { refund }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getRefundHistory = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const history = await WalletService.getRefundHistory(ownerType, ownerId);
      const paginated = history.slice(offset, offset + limit);

      return this.sendSuccess(res, { refunds: paginated, total: history.length, limit, offset });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Subscriptions
  getSubscriptions = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const subscriptions = await WalletService.getSubscriptions(ownerType, ownerId);
      return this.sendSuccess(res, { subscriptions });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getSubscription = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const subscription = await WalletService.getSubscription(subscriptionId);
      return this.sendSuccess(res, { subscription });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createSubscription = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const { planId, planName, amount, duration } = req.body;

      if (!planId || !planName || !amount) {
        throw new HttpException(400, 'Missing required fields: planId, planName, amount');
      }

      const subscription = await WalletService.createSubscription(ownerType, ownerId, {
        planId,
        planName,
        amount,
        duration: duration || 1
      });

      return this.sendSuccess(res, { subscription }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  renewSubscription = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const subscription = await WalletService.renewSubscription(subscriptionId);
      return this.sendSuccess(res, { subscription });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  cancelSubscription = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const subscription = await WalletService.cancelSubscription(subscriptionId);
      return this.sendSuccess(res, { subscription });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Add-ons
  purchaseAddonService = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const { addonId, addonName, amount, description } = req.body;

      if (!addonId || !addonName || !amount) {
        throw new HttpException(400, 'Missing required fields: addonId, addonName, amount');
      }

      const purchase = await WalletService.purchaseAddonService(ownerType, ownerId, {
        addonId,
        addonName,
        amount,
        description
      });

      return this.sendSuccess(res, { purchase }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Stripe
  createStripeCheckoutSession = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const { amount, planName, successUrl, cancelUrl } = req.body;

      if (!amount || !planName) {
        throw new HttpException(400, 'Missing required fields: amount, planName');
      }

      const session = await WalletService.createStripeCheckoutSession(ownerType, ownerId, {
        amount,
        planName,
        successUrl,
        cancelUrl
      });

      return this.sendSuccess(res, { session }, 201);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Admin Routes
  getPendingWithdrawals = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'SUPER_ADMIN') {
        throw new HttpException(403, 'Unauthorized: Admin only');
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const withdrawals = await WalletService.getPendingWithdrawals();
      const paginated = withdrawals.slice(offset, offset + limit);

      return this.sendSuccess(res, { withdrawals: paginated, total: withdrawals.length, limit, offset });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  approveWithdrawal = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'SUPER_ADMIN') {
        throw new HttpException(403, 'Unauthorized: Admin only');
      }

      const { withdrawalId } = req.params;
      const withdrawal = await WalletService.approveWithdrawal(withdrawalId);

      return this.sendSuccess(res, { withdrawal });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  rejectWithdrawal = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'SUPER_ADMIN') {
        throw new HttpException(403, 'Unauthorized: Admin only');
      }

      const { withdrawalId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        throw new HttpException(400, 'Reason is required for rejection');
      }

      const withdrawal = await WalletService.rejectWithdrawal(withdrawalId, reason);
      return this.sendSuccess(res, { withdrawal });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getWalletStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'SUPER_ADMIN') {
        throw new HttpException(403, 'Unauthorized: Admin only');
      }

      const stats = await WalletService.getWalletStats();
      return this.sendSuccess(res, { stats });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getPendingRefunds = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'SUPER_ADMIN') {
        throw new HttpException(403, 'Unauthorized: Admin only');
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const refunds = await WalletService.getPendingRefunds?.() || [];
      const paginated = refunds.slice(offset, offset + limit);

      return this.sendSuccess(res, { refunds: paginated, total: refunds.length, limit, offset });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  approveRefund = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'SUPER_ADMIN') {
        throw new HttpException(403, 'Unauthorized: Admin only');
      }

      const { refundId } = req.params;
      const refund = await WalletService.approveRefund?.(refundId) || null;

      if (!refund) {
        throw new HttpException(404, 'Refund not found');
      }

      return this.sendSuccess(res, { refund });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  rejectRefund = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'SUPER_ADMIN') {
        throw new HttpException(403, 'Unauthorized: Admin only');
      }

      const { refundId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        throw new HttpException(400, 'Reason is required for rejection');
      }

      const refund = await WalletService.rejectRefund?.(refundId, reason) || null;

      if (!refund) {
        throw new HttpException(404, 'Refund not found');
      }

      return this.sendSuccess(res, { refund });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
