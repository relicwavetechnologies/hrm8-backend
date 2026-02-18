import { Response } from 'express';
import { BaseController } from '../../core/controller';
import { WalletService } from './wallet.service';
import { SubscriptionService } from '../subscription/subscription.service';
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
      const { amount, paymentMethod, bankDetails, notes } = req.body;

      if (!amount || !paymentMethod) {
        throw new HttpException(400, 'Missing required fields: amount, paymentMethod');
      }

      const withdrawal = await WalletService.requestWithdrawal(ownerType, ownerId, {
        amount,
        paymentMethod,
        bankDetails,
        notes
      });

      return this.sendSuccess(res, { withdrawal });
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
      const withdrawalsList = history.withdrawals;
      const filtered = status ? withdrawalsList.filter(w => w.status === status) : withdrawalsList;
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

      return this.sendSuccess(res, { refund });
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
      const subscription = await WalletService.getSubscription(subscriptionId as string);
      return this.sendSuccess(res, { subscription });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  createSubscription = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const body = req.body as {
        planName?: string; planType?: string; name?: string;
        amount?: number; basePrice?: number;
        billingCycle?: string; jobQuota?: number; autoRenew?: boolean;
      };
      const planName = body.planName ?? body.name;
      const amount = body.amount ?? body.basePrice;
      const billingCycle = (body.billingCycle || 'MONTHLY') as 'MONTHLY' | 'ANNUAL';

      if (!planName || amount == null) {
        throw new HttpException(400, 'Missing required fields: planName/name and amount/basePrice');
      }

      // Company subscriptions: use SubscriptionService (subscription snapshot + quota only)
      if (ownerType === 'COMPANY') {
        const planType = (body.planType || planName).toUpperCase().replace(/-/g, '_');
        const subscription = await SubscriptionService.createSubscription({
          companyId: ownerId,
          planType: planType as any,
          name: planName,
          basePrice: amount,
          billingCycle,
          jobQuota: body.jobQuota ?? undefined,
          autoRenew: body.autoRenew ?? true,
        });
        return this.sendSuccess(res, {
          subscription,
          message: 'Subscription activated successfully.',
        });
      }

      // Non-company (e.g. consultant): legacy path
      const subscription = await WalletService.createSubscription(ownerType, ownerId, {
        name: planName,
        amount: Number(amount),
        billingCycle,
      });
      return this.sendSuccess(res, { subscription });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  renewSubscription = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const subscription = await WalletService.renewSubscription(subscriptionId as string);
      return this.sendSuccess(res, { subscription });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  cancelSubscription = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const subscription = await WalletService.cancelSubscription(subscriptionId as string);
      return this.sendSuccess(res, { subscription });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Add-ons
  purchaseAddonService = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const { addonName, amount, quantity, description } = req.body;

      if (!addonName || !amount) {
        throw new HttpException(400, 'Missing required fields: addonName, amount');
      }

      const purchase = await WalletService.purchaseAddonService(ownerType, ownerId, {
        addonName,
        amount,
        quantity,
        description
      });

      return this.sendSuccess(res, { purchase });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  // Stripe
  createStripeCheckoutSession = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ownerType, ownerId } = this.getOwnerInfo(req);
      const { amount, description, successUrl, cancelUrl } = req.body;

      if (!amount || !successUrl || !cancelUrl) {
        throw new HttpException(400, 'Missing required fields: amount, successUrl, cancelUrl');
      }

      const session = await WalletService.createStripeCheckoutSession(ownerType, ownerId, {
        amount,
        description,
        successUrl,
        cancelUrl
      });

      return this.sendSuccess(res, { session });
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

      const result = await WalletService.getPendingWithdrawals();
      const withdrawalsList = result.withdrawals;
      const paginated = withdrawalsList.slice(offset, offset + limit);

      return this.sendSuccess(res, { withdrawals: paginated, total: withdrawalsList.length, limit, offset });
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
      const withdrawal = await WalletService.approveWithdrawal(withdrawalId as string);

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

      const withdrawal = await WalletService.rejectWithdrawal(withdrawalId as string, reason);
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
      const refund = await WalletService.approveRefund?.(refundId as string) || null;

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

      const refund = await WalletService.rejectRefund?.(refundId as string, reason) || null;

      if (!refund) {
        throw new HttpException(404, 'Refund not found');
      }

      return this.sendSuccess(res, { refund });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
