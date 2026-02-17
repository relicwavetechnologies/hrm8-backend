import { Router } from 'express';
import { Hrm8Controller } from './hrm8.controller';
import { AuditLogController } from './audit-log.controller';
import { CommissionController } from './commission.controller';
import { ComplianceController } from './compliance.controller';
import { JobAllocationController } from './job-allocation.controller';
import { RegionalLicenseeController } from './regional-licensee.controller';
import { LeadConversionController } from './lead-conversion.controller';
import { RefundController } from './refund.controller';
import { PricingController } from './pricing.controller';
import { RegionController } from './region.controller';
import { StaffController } from './staff.controller';
import { AnalyticsController } from './analytics.controller';
import { RegionalSalesController } from './regional-sales.controller';
import { RevenueController } from './revenue.controller';
import { Hrm8IntegrationsController } from './hrm8-integrations.controller';
import { WithdrawalController } from './withdrawal.controller';
import { SettlementController } from './settlement.controller';
import { SettingsController } from './settings.controller';
import { RegionalCompanyController } from './regional-company.controller';
import { FinanceController } from './finance.controller';
import { CapacityController } from './capacity.controller';
import { AlertController } from './alert.controller';
import { OverviewController } from './overview.controller';
import { AttributionController } from './attribution.controller';
import { authenticateHrm8 } from '../../middlewares/hrm8-auth.middleware';
import { requireHrm8Role } from '../../middlewares/hrm8-auth.middleware';

import { CareersRequestController } from './careers-request.controller';

const router = Router();
const hrm8Controller = new Hrm8Controller();
const auditLogController = new AuditLogController();
const commissionController = new CommissionController();
const complianceController = new ComplianceController();
const jobAllocationController = new JobAllocationController();
const regionalLicenseeController = new RegionalLicenseeController();
const regionalCompanyController = new RegionalCompanyController();
const leadConversionController = new LeadConversionController();
const refundController = new RefundController();
const pricingController = new PricingController();
const regionController = new RegionController();
const staffController = new StaffController();
const analyticsController = new AnalyticsController();
const regionalSalesController = new RegionalSalesController();
const revenueController = new RevenueController();
const hrm8IntegrationsController = new Hrm8IntegrationsController();
const withdrawalController = new WithdrawalController();
const settlementController = new SettlementController();
const settingsController = new SettingsController();
const financeController = new FinanceController();
const capacityController = new CapacityController();
const alertController = new AlertController();
const overviewController = new OverviewController();
const attributionController = new AttributionController();
const careersRequestController = new CareersRequestController();

// Auth Routes
router.post('/auth/login', hrm8Controller.login);
router.post('/auth/logout', hrm8Controller.logout);
router.get('/auth/me', authenticateHrm8, hrm8Controller.getCurrentUser);
router.put('/auth/change-password', authenticateHrm8, hrm8Controller.changePassword);
router.get('/profile', authenticateHrm8, hrm8Controller.getProfileDetail);
router.put('/profile', authenticateHrm8, hrm8Controller.updateProfileDetail);

// Audit Log Routes
router.get('/audit-logs', authenticateHrm8, auditLogController.getRecent);
router.get('/audit-logs/stats', authenticateHrm8, auditLogController.getStats);
router.get('/audit-logs/:entityType/:entityId', authenticateHrm8, auditLogController.getByEntity);

// Commission Routes
router.get('/commissions', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), commissionController.getAll);
router.post('/commissions', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), commissionController.create);
router.post('/commissions/pay', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), commissionController.processPayments);
router.get('/commissions/regional', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), commissionController.getRegional);
router.get('/commissions/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), commissionController.getById);
router.put('/commissions/:id/confirm', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), commissionController.confirm);
router.put('/commissions/:id/pay', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), commissionController.markAsPaid);
router.put('/commissions/:id/dispute', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), commissionController.dispute);
router.put('/commissions/:id/resolve', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), commissionController.resolveDispute);
router.put('/commissions/:id/clawback', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), commissionController.clawback);

// Compliance Routes
router.get('/compliance/alerts', authenticateHrm8, complianceController.getAlerts);
router.get('/compliance/summary', authenticateHrm8, complianceController.getAlertSummary);
router.get('/compliance/audit/recent', authenticateHrm8, complianceController.getRecentAudit);
router.get('/compliance/audit/:entityType/:entityId', authenticateHrm8, complianceController.getAuditHistory);

// Job Allocation Routes
router.get('/job-allocation/stats', authenticateHrm8, jobAllocationController.getStats);
router.post('/job-allocation', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), jobAllocationController.allocate);
router.get('/job-allocation/licensee/:id', authenticateHrm8, jobAllocationController.getByLicensee);
router.delete('/job-allocation/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), jobAllocationController.deallocate);

router.post('/jobs/:jobId/assign-consultant', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), jobAllocationController.assignConsultant);
router.post('/jobs/:jobId/assign-region', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), jobAllocationController.assignRegion);
router.post('/jobs/:jobId/unassign', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), jobAllocationController.unassign);
router.get('/jobs/:jobId/consultants', authenticateHrm8, jobAllocationController.getJobConsultants);
router.get('/jobs/:jobId/assignment-info', authenticateHrm8, jobAllocationController.getAssignmentInfo);
router.get('/jobs/allocation', authenticateHrm8, jobAllocationController.getJobsForAllocation);
router.get('/jobs/detail/:jobId', authenticateHrm8, jobAllocationController.getJobDetail);
router.post('/jobs/:jobId/auto-assign', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), jobAllocationController.autoAssign);
router.get('/consultants/for-assignment', authenticateHrm8, jobAllocationController.getConsultantsForAssignment);

// Regional Licensee Routes
router.get('/regional-licensee', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getAll);
router.get('/regional-licensee/stats', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getStats);
router.get('/regional-licensee/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getById);
router.post('/regional-licensee', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.create);
router.put('/regional-licensee/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.update);
router.delete('/regional-licensee/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.delete);
router.put('/regional-licensee/:id/status', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.updateStatus);
router.post('/regional-licensee/:id/suspend', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.suspend);
router.post('/regional-licensee/:id/reactivate', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.reactivate);
router.post('/regional-licensee/:id/terminate', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.terminate);
router.get('/regional-licensee/:id/impact-preview', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getImpactPreview);

// Legacy Alias for Frontend Compatibility
router.get('/licensees', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getAll);
router.get('/licensees/overview', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getOverview);
router.get('/licensees/stats', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getStats);
router.get('/licensees/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getById);
router.post('/licensees', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.create);
router.put('/licensees/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.update);
router.delete('/licensees/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.delete);
router.put('/licensees/:id/status', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.updateStatus);
router.post('/licensees/:id/suspend', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.suspend);
router.post('/licensees/:id/reactivate', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.reactivate);
router.post('/licensees/:id/terminate', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.terminate);
router.get('/licensees/:id/impact-preview', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getImpactPreview);

// Company Routes
router.get('/companies/:id', authenticateHrm8, regionalCompanyController.getById);
router.get('/companies/:id/jobs', authenticateHrm8, regionalCompanyController.getCompanyJobs);

// Lead Conversion Routes
router.get('/conversion-requests', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), leadConversionController.getAll);
router.get('/conversion-requests/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), leadConversionController.getOne);
router.put('/conversion-requests/:id/approve', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), leadConversionController.approve);
router.put('/conversion-requests/:id/decline', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), leadConversionController.decline);

// Careers Request Routes
router.get('/careers/requests', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), careersRequestController.getRequests);
router.post('/careers/:id/approve', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), careersRequestController.approve);
router.post('/careers/:id/reject', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), careersRequestController.reject);

// Refund Routes
router.get('/refund-requests', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), refundController.getAll);
router.put('/refund-requests/:id/approve', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), refundController.approve);
router.put('/refund-requests/:id/reject', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), refundController.reject);
router.put('/refund-requests/:id/complete', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), refundController.complete);

// Pricing Routes
router.get('/pricing/products', authenticateHrm8, pricingController.getProducts);
router.post('/pricing/products', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.upsertProduct);
router.delete('/pricing/products/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.deleteProduct);

router.get('/pricing/price-books', authenticateHrm8, pricingController.getPriceBooks);
router.post('/pricing/price-books', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.createPriceBook);
router.put('/pricing/price-books/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.updatePriceBook);
router.delete('/pricing/price-books/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.deletePriceBook);

router.post('/pricing/tiers/:priceBookId', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.createTier);
router.put('/pricing/tiers/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.updateTier);
router.delete('/pricing/tiers/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.deleteTier);

router.get('/pricing/promo-codes', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.getPromoCodes);
router.post('/pricing/promo-codes', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.createPromoCode);
router.put('/pricing/promo-codes/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.updatePromoCode);
router.delete('/pricing/promo-codes/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.deletePromoCode);
router.post('/pricing/promo-codes/validate', authenticateHrm8, pricingController.validatePromoCode);

// Region Routes
router.get('/regions', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionController.getAll);
router.get('/regions/overview', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionController.getOverview);
router.get('/regions/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionController.getById);
router.post('/regions', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.create);
router.put('/regions/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.update);
router.delete('/regions/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.delete);
router.post('/regions/:regionId/assign-licensee', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.assignLicensee);
router.post('/regions/:regionId/unassign-licensee', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.unassignLicensee);
router.get('/regions/:regionId/transfer-impact', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.getTransferImpact);
// Legacy alias for ATS compatibility
router.post('/regions/:regionId/transfer', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.transferOwnership);
router.post('/regions/:regionId/transfer-ownership', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.transferOwnership);

// Staff Management Routes
router.get('/consultants/overview', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), staffController.getOverview);
router.get('/consultants', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), staffController.getAll);
router.get('/consultants/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), staffController.getById);
router.post('/consultants', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), staffController.create);
router.put('/consultants/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), staffController.update);
router.post('/consultants/:id/assign-region', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), staffController.assignRegion);
router.post('/consultants/:id/suspend', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), staffController.suspend);
router.post('/consultants/:id/reactivate', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), staffController.reactivate);
router.delete('/consultants/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), staffController.delete);
router.post('/consultants/generate-email', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), staffController.generateEmail);
router.post('/consultants/:id/reassign-jobs', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), staffController.reassignJobs);
router.get('/consultants/:id/pending-tasks', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), staffController.getPendingTasks);
router.get('/consultants/:id/reassignment-options', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), staffController.getReassignmentOptions);
router.put('/consultants/:id/change-role', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), staffController.changeRole);
router.post('/consultants/:id/invite', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), staffController.invite);

// Analytics Routes
router.get('/overview', authenticateHrm8, overviewController.getOverview);
router.get('/analytics/overview', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), analyticsController.getPlatformOverview);
router.get('/analytics/trends', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), analyticsController.getPlatformTrends);
router.get('/analytics/top-companies', authenticateHrm8, analyticsController.getTopCompanies);
router.get('/analytics/regional/:regionId/operational', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), analyticsController.getOperationalStats);
router.get('/analytics/regional/:regionId/companies', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), analyticsController.getRegionalCompanies);

// Regional Sales Routes
router.get('/sales/regional/opportunities', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionalSalesController.getOpportunities);
router.get('/sales/regional/stats', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionalSalesController.getStats);
router.get('/sales/regional/activities', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionalSalesController.getActivities);
router.get('/leads/regional', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionalSalesController.getLeads);
router.post('/leads/:leadId/reassign', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionalSalesController.reassignLead);

// Revenue Routes
router.get('/revenue/regional', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), revenueController.getAll);
router.get('/revenue/regional/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), revenueController.getById);
router.put('/revenue/regional/:id/confirm', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), revenueController.confirm);
router.put('/revenue/regional/:id/pay', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), revenueController.markAsPaid);
router.get('/revenue/analytics/company-breakdown', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), revenueController.getCompanyBreakdown);
router.get('/revenue/dashboard', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), revenueController.getDashboard);
router.get('/revenue/summary', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), revenueController.getSummary);

// Withdrawal Routes
router.get('/admin/billing/withdrawals', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), withdrawalController.getPendingWithdrawals);
router.post('/admin/billing/withdrawals/:id/approve', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), withdrawalController.approve);
router.post('/admin/billing/withdrawals/:id/reject', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), withdrawalController.reject);
router.post('/admin/billing/withdrawals/:id/process', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), withdrawalController.processPayment);

// Settlement Routes
router.get('/admin/billing/settlements', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), settlementController.getAll);
router.get('/admin/billing/settlements/stats', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), settlementController.getStats);
router.put('/finance/settlements/:id/pay', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), settlementController.markAsPaid); // Matching frontend error route

// Settings Routes
router.get('/settings/overview', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), hrm8Controller.getSystemOverview);
router.get('/settings', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), settingsController.getSettings);
router.put('/settings', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), settingsController.updateSetting);

// Integrations Routes (HRM8 Settings Workspace)
router.get('/integrations/catalog', authenticateHrm8, hrm8IntegrationsController.getCatalog);
router.post('/integrations/global-config', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), hrm8IntegrationsController.upsertGlobalConfig);
router.get('/integrations/usage', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), hrm8IntegrationsController.getUsage);
router.get('/integrations/company/:companyId', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), hrm8IntegrationsController.getCompanyIntegrations);
router.post('/integrations/company/:companyId', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), hrm8IntegrationsController.createCompanyIntegration);
router.put('/integrations/company/:companyId/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), hrm8IntegrationsController.updateCompanyIntegration);
router.delete('/integrations/company/:companyId/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), hrm8IntegrationsController.deleteCompanyIntegration);

// Finance Routes
router.get('/finance/overview', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), financeController.getOverview);
router.get('/finance/invoices', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), financeController.getInvoices);
router.get('/finance/dunning', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), financeController.getDunning);
router.post('/finance/settlements/calculate', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), financeController.calculateSettlement);

// Capacity Routes
router.get('/consultants/capacity-warnings', authenticateHrm8, capacityController.getCapacityWarnings);

// System Alerts Routes
router.get('/alerts', authenticateHrm8, alertController.getActiveAlerts);

// Attribution Routes
router.get('/attribution/companies/search', authenticateHrm8, attributionController.searchCompanies);
router.get('/attribution/:companyId', authenticateHrm8, attributionController.getAttribution);
router.get('/attribution/:companyId/history', authenticateHrm8, attributionController.getAttributionHistory);
router.post('/attribution/:companyId/lock', authenticateHrm8, attributionController.lockAttribution);
router.post('/attribution/:companyId/override', authenticateHrm8, attributionController.overrideAttribution);

// Aliases for Frontend Compatibility
router.get('/finance/settlements', authenticateHrm8, settlementController.getAll);
router.get('/revenue', authenticateHrm8, revenueController.getAll);
router.get('/revenue/companies', authenticateHrm8, revenueController.getCompanyBreakdown);
router.get('/pricing/books', authenticateHrm8, pricingController.getPriceBooks);
router.get('/jobs/companies', authenticateHrm8, analyticsController.getJobBoardStats); // Job board company stats

export default router;
