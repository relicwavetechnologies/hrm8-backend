# Migration Routes Status

This document tracks the migration of routes from the old backend to the new backend structure.

## 1. Wallet Module (Priority: High)
**Base Path:** `/api/wallet`

| Method | Old Path | New Path | Status | Controller |
|--------|----------|----------|--------|------------|
| GET | `/api/wallet/account` | `/api/wallet/account` | ✅ Completed | `WalletController.getAccount` |
| GET | `/api/wallet/balance` | `/api/wallet/balance` | ✅ Completed | `WalletController.getBalance` |
| GET | `/api/wallet/transactions` | `/api/wallet/transactions` | ✅ Completed | `WalletController.getTransactions` |
| GET | `/api/wallet/verify` | `/api/wallet/verify` | ⏳ Pending | `WalletController.verifyIntegrity` |
| GET | `/api/wallet/transaction/:id` | `/api/wallet/transactions/:id` | ⏳ Pending | `WalletController.getTransaction` |
| GET | `/api/wallet/history` | `/api/wallet/history` | ⏳ Pending | `WalletController.getHistory` |

## 2. Subscription Module (Priority: High)
**Base Path:** `/api/subscriptions` (or `/api/wallet` for backward compat)

| Method | Old Path | New Path | Status | Controller |
|--------|----------|----------|--------|------------|
| POST | `/api/wallet/subscription` | `/api/subscriptions` | ✅ Completed | `SubscriptionController.create` |
| GET | `/api/wallet/subscription/:id` | `/api/subscriptions/:id` | ⏳ Pending | `SubscriptionController.getById` |
| GET | `/api/wallet/subscriptions` | `/api/subscriptions` | ⏳ Pending | `SubscriptionController.list` |
| POST | `/api/wallet/subscription/:id/renew` | `/api/subscriptions/:id/renew` | ⏳ Pending | `SubscriptionController.renew` |
| POST | `/api/wallet/subscription/:id/cancel` | `/api/subscriptions/:id/cancel` | ⏳ Pending | `SubscriptionController.cancel` |
| POST | `/api/wallet/subscription/job-posting` | `/api/subscriptions/charge/job` | ⏳ Pending | `SubscriptionController.chargeJob` |
| POST | `/api/wallet/subscription/addon-service` | `/api/subscriptions/charge/addon` | ⏳ Pending | `SubscriptionController.chargeAddon` |
| GET | `/api/wallet/subscription/:id/stats` | `/api/subscriptions/:id/stats` | ⏳ Pending | `SubscriptionController.stats` |
| GET | `/api/wallet/pricing/products` | `/api/subscriptions/products` | ⏳ Pending | `SubscriptionController.products` |
| GET | `/api/wallet/pricing/tiers` | `/api/subscriptions/tiers` | ⏳ Pending | `SubscriptionController.tiers` |

## 3. Commission & Withdrawal (Priority: Medium)
**Base Path:** `/api/wallet`

| Method | Old Path | New Path | Status | Controller |
|--------|----------|----------|--------|------------|
| GET | `/api/wallet/earnings` | `/api/wallet/earnings` | ⏳ Pending | `WalletController.getEarnings` |
| POST | `/api/wallet/withdrawal/request` | `/api/wallet/withdrawals` | ⏳ Pending | `WalletController.requestWithdrawal` |
| GET | `/api/wallet/withdrawal/history` | `/api/wallet/withdrawals` | ⏳ Pending | `WalletController.getWithdrawals` |

## 4. Admin Wallet Routes (Priority: Low)
**Base Path:** `/api/admin/wallet`

| Method | Old Path | New Path | Status | Controller |
|--------|----------|----------|--------|------------|
| POST | `/api/wallet/admin/credit` | `/api/admin/wallet/credit` | ⏳ Pending | `AdminWalletController.credit` |
| POST | `/api/wallet/admin/debit` | `/api/admin/wallet/debit` | ⏳ Pending | `AdminWalletController.debit` |
| POST | `/api/wallet/admin/transfer` | `/api/admin/wallet/transfer` | ⏳ Pending | `AdminWalletController.transfer` |
| PUT | `/api/wallet/admin/status` | `/api/admin/wallet/status` | ⏳ Pending | `AdminWalletController.updateStatus` |
| GET | `/api/wallet/admin/wallets` | `/api/admin/wallet/accounts` | ⏳ Pending | `AdminWalletController.listWallets` |
| GET | `/api/wallet/admin/stats` | `/api/admin/wallet/stats` | ⏳ Pending | `AdminWalletController.stats` |

## 5. Company Dashboard Specific (Priority: High)
**Base Path:** `/api/companies`

| Method | Old Path | New Path | Status | Controller |
|--------|----------|----------|--------|------------|
| GET | `/api/companies/:id/stats` | `/api/companies/:id/stats` | ✅ Completed | `CompanyController.getStats` |
| GET | `/api/companies/:id/subscription/active` | `/api/companies/:id/subscription/active` | ✅ Completed | `SubscriptionController.getActive` |
