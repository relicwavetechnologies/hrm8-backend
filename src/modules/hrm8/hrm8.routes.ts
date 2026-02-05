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
import { PromoCodeController } from './promo-code.controller';
import { RegionController } from './region.controller';
import { StaffController } from './staff.controller';
import { AnalyticsController } from './analytics.controller';
import { RegionalSalesController } from './regional-sales.controller';
import { RevenueController } from './revenue.controller';
import { WithdrawalController } from './withdrawal.controller';
import { SettlementController } from './settlement.controller';
import { SettingsController } from './settings.controller';
import { SystemSettingsController } from './system-settings/system-settings.controller';
import { IntegrationAdminController } from './integrations/integration-admin.controller';
import { CompanyIntegrationController } from './integrations/company-integration.controller';
import { RegionalCompanyController } from './regional-company.controller';
import { FinanceController } from './finance.controller';
import { CapacityController } from './capacity.controller';
import { AlertController } from './alert.controller';
import { MessagingController } from './messaging.controller';
import { authenticateHrm8, requireHrm8Role } from '../../middlewares/hrm8-auth.middleware';
import { Hrm8ProfileController } from './profile.controller';

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
const promoCodeController = new PromoCodeController();
const regionController = new RegionController();
const staffController = new StaffController();
const analyticsController = new AnalyticsController();
const regionalSalesController = new RegionalSalesController();
const revenueController = new RevenueController();
const withdrawalController = new WithdrawalController();
const settlementController = new SettlementController();
const settingsController = new SettingsController();
const companyIntegrationController = new CompanyIntegrationController();
const financeController = new FinanceController();
const capacityController = new CapacityController();
const alertController = new AlertController();
const messagingController = new MessagingController();
const careersRequestController = new CareersRequestController();
const profileController = new Hrm8ProfileController();

// Auth Routes
router.post('/auth/login', hrm8Controller.login);
router.post('/auth/logout', hrm8Controller.logout);
router.get('/auth/me', authenticateHrm8, hrm8Controller.getCurrentUser);
router.put('/auth/change-password', authenticateHrm8, hrm8Controller.changePassword);
router.post('/auth/change-password', authenticateHrm8, hrm8Controller.changePassword);

// Profile Routes
router.get('/profile', authenticateHrm8, profileController.getProfile);
router.put('/profile', authenticateHrm8, profileController.updateProfile);

// Audit Log Routes
router.get('/audit-logs', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), auditLogController.getRecent);
router.get('/audit-logs/stats', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), auditLogController.getStats);
router.get('/audit-logs/:entityType/:entityId', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), auditLogController.getByEntity);

// Commission Routes
router.get('/commissions', authenticateHrm8, commissionController.getAll);
router.post('/commissions', authenticateHrm8, commissionController.create);
router.post('/commissions/pay', authenticateHrm8, commissionController.processPayments);
router.get('/commissions/regional', authenticateHrm8, commissionController.getRegional);
router.get('/commissions/:id', authenticateHrm8, commissionController.getById);
router.put('/commissions/:id/confirm', authenticateHrm8, commissionController.confirm);
router.put('/commissions/:id/pay', authenticateHrm8, commissionController.markAsPaid);

// Compliance Routes
router.get('/compliance/alerts', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), complianceController.getAlerts);
router.get('/compliance/summary', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), complianceController.getAlertSummary);
router.get('/compliance/audit/recent', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), complianceController.getRecentAudit);
router.get('/compliance/audit/:entityType/:entityId', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), complianceController.getAuditHistory);

// Job Allocation Routes
router.get('/job-allocation/stats', authenticateHrm8, jobAllocationController.getStats);
router.post('/job-allocation', authenticateHrm8, jobAllocationController.allocate);
router.get('/job-allocation/licensee/:id', authenticateHrm8, jobAllocationController.getByLicensee);
router.delete('/job-allocation/:id', authenticateHrm8, jobAllocationController.deallocate);

router.post('/jobs/:jobId/assign-consultant', authenticateHrm8, jobAllocationController.assignConsultant);
router.post('/jobs/:jobId/assign-region', authenticateHrm8, jobAllocationController.assignRegion);
router.post('/jobs/:jobId/unassign', authenticateHrm8, jobAllocationController.unassign);
router.get('/jobs/:jobId/consultants', authenticateHrm8, jobAllocationController.getJobConsultants);
router.get('/jobs/:jobId/assignment-info', authenticateHrm8, jobAllocationController.getAssignmentInfo);
router.get('/jobs/allocation', authenticateHrm8, jobAllocationController.getJobsForAllocation);
router.get('/jobs/detail/:jobId', authenticateHrm8, jobAllocationController.getJobDetail);
router.get('/jobs/companies', authenticateHrm8, jobAllocationController.getJobBoardCompanies);
router.put('/jobs/:jobId/visibility', authenticateHrm8, jobAllocationController.updateJobVisibility);
router.put('/jobs/:jobId/status', authenticateHrm8, jobAllocationController.updateJobStatus);
router.post('/jobs/:jobId/auto-assign', authenticateHrm8, jobAllocationController.autoAssign);
router.get('/consultants/for-assignment', authenticateHrm8, jobAllocationController.getConsultantsForAssignment);

// Regional Licensee Routes
router.get('/regional-licensee', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getAll);
router.get('/regional-licensee/stats', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getStats);
router.get('/regional-licensee/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getById);
router.post('/regional-licensee', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.create);
router.put('/regional-licensee/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.update);
router.delete('/regional-licensee/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.delete);
router.put('/regional-licensee/:id/status', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.updateStatus);
router.get('/regional-licensee/:id/impact-preview', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getImpactPreview);

// Legacy Alias for Frontend Compatibility
router.get('/licensees', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getAll);
router.get('/licensees/stats', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getStats);
router.get('/licensees/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getById);
router.post('/licensees', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.create);
router.put('/licensees/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.update);
router.delete('/licensees/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.delete);
router.put('/licensees/:id/status', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.updateStatus);
router.post('/licensees/:id/terminate', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.terminate);
router.post('/licensees/:id/reactivate', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), (req, res, next) => {
    req.body.status = 'ACTIVE';
    return regionalLicenseeController.updateStatus(req, res);
});
router.post('/licensees/:id/suspend', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), (req, res, next) => {
    req.body.status = 'SUSPENDED';
    return regionalLicenseeController.updateStatus(req, res);
});
router.get('/licensees/:id/impact-preview', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionalLicenseeController.getImpactPreview);

// Company Routes
router.get('/companies/:id', authenticateHrm8, regionalCompanyController.getById);
router.get('/companies/:id/jobs', authenticateHrm8, regionalCompanyController.getCompanyJobs);

// Lead Conversion Routes
router.get('/conversion-requests', authenticateHrm8, leadConversionController.getAll);
router.get('/conversion-requests/:id', authenticateHrm8, leadConversionController.getOne);
router.put('/conversion-requests/:id/approve', authenticateHrm8, leadConversionController.approve);
router.put('/conversion-requests/:id/decline', authenticateHrm8, leadConversionController.decline);

// Careers Request Routes
router.get('/careers/requests', authenticateHrm8, careersRequestController.getRequests);
router.post('/careers/:id/approve', authenticateHrm8, careersRequestController.approve);
router.post('/careers/:id/reject', authenticateHrm8, careersRequestController.reject);

// Refund Routes
router.get('/refund-requests', authenticateHrm8, refundController.getAll);
router.put('/refund-requests/:id/approve', authenticateHrm8, refundController.approve);
router.put('/refund-requests/:id/reject', authenticateHrm8, refundController.reject);
router.put('/refund-requests/:id/complete', authenticateHrm8, refundController.complete);

// Pricing Routes
router.get('/pricing/products', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.getProducts);
router.get('/pricing/price-books', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.getPriceBooks);
router.get('/pricing/books', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.getPriceBooks);
router.post('/pricing/products', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.upsertProduct);
router.put('/pricing/products/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.upsertProduct);
router.post('/pricing/price-books', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.upsertPriceBook);
router.put('/pricing/price-books/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.upsertPriceBook);
router.post('/pricing/price-tiers', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.upsertPriceTier);
router.put('/pricing/price-tiers/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.upsertPriceTier);

// Promo Code Routes
router.get('/pricing/promo-codes', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), promoCodeController.getAll);
router.post('/pricing/promo-codes', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), promoCodeController.create);
router.put('/pricing/promo-codes/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), promoCodeController.update);

// Region Routes
router.get('/regions', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionController.getAll);
router.get('/regions/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionController.getById);
router.post('/regions', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.create);
router.put('/regions/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.update);
router.delete('/regions/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.delete);
router.post('/regions/:regionId/assign-licensee', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.assignLicensee);
router.post('/regions/:regionId/unassign-licensee', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.unassignLicensee);
router.get('/regions/:regionId/transfer-impact', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.getTransferImpact);
router.post('/regions/:regionId/transfer-ownership', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), regionController.transferOwnership);

// Staff Management Routes
router.get('/consultants', authenticateHrm8, staffController.getAll);
router.get('/consultants/:id', authenticateHrm8, staffController.getById);
router.get('/consultants/:id/stats', authenticateHrm8, staffController.getStats);
router.post('/consultants', authenticateHrm8, staffController.create);
router.put('/consultants/:id', authenticateHrm8, staffController.update);
router.post('/consultants/:id/assign-region', authenticateHrm8, staffController.assignRegion);
router.post('/consultants/:id/suspend', authenticateHrm8, staffController.suspend);
router.post('/consultants/:id/reactivate', authenticateHrm8, staffController.reactivate);
router.delete('/consultants/:id', authenticateHrm8, staffController.delete);
router.post('/consultants/generate-email', authenticateHrm8, staffController.generateEmail);
router.post('/consultants/:id/reassign-jobs', authenticateHrm8, staffController.reassignJobs);
router.get('/consultants/:id/pending-tasks', authenticateHrm8, staffController.getPendingTasks);
router.get('/consultants/:id/reassignment-options', authenticateHrm8, staffController.getReassignmentOptions);
router.put('/consultants/:id/change-role', authenticateHrm8, staffController.changeRole);
router.post('/consultants/:id/invite', authenticateHrm8, staffController.invite);

// Analytics Routes
router.get('/analytics/overview', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), analyticsController.getPlatformOverview);
router.get('/analytics/trends', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), analyticsController.getPlatformTrends);
router.get('/analytics/top-companies', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), analyticsController.getTopCompanies);
router.get('/analytics/regional/:regionId/operational', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), analyticsController.getOperationalStats);
router.get('/analytics/regional/:regionId/companies', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), analyticsController.getRegionalCompanies);

// Regional Sales Routes
router.get('/sales/regional/opportunities', authenticateHrm8, regionalSalesController.getOpportunities);
router.get('/sales/regional/stats', authenticateHrm8, regionalSalesController.getStats);
router.get('/sales/regional/activities', authenticateHrm8, regionalSalesController.getActivities);
router.get('/leads/regional', authenticateHrm8, regionalSalesController.getLeads);
router.post('/leads/:leadId/reassign', authenticateHrm8, regionalSalesController.reassignLead);

// Revenue Routes
router.get('/revenue/regional', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), revenueController.getAll);
router.get('/revenue/regional/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), revenueController.getById);
router.put('/revenue/regional/:id/confirm', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), revenueController.confirm);
router.put('/revenue/regional/:id/pay', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), revenueController.markAsPaid);
router.get('/revenue/analytics/company-breakdown', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), revenueController.getCompanyBreakdown);
router.get('/revenue/dashboard', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), revenueController.getDashboard);
router.get('/revenue/summary', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), revenueController.getSummary);

// Withdrawal Routes
router.get('/admin/billing/withdrawals', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), withdrawalController.getPendingWithdrawals);
router.post('/admin/billing/withdrawals/:id/approve', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), withdrawalController.approve);
router.post('/admin/billing/withdrawals/:id/reject', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), withdrawalController.reject);
router.post('/admin/billing/withdrawals/:id/process', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), withdrawalController.processPayment);

// Settlement Routes
router.get('/admin/billing/settlements', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), settlementController.getAll);
router.get('/admin/billing/settlements/stats', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), settlementController.getStats);
router.put('/finance/settlements/:id/pay', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), settlementController.markAsPaid); // Matching frontend error route

// Settings Routes
router.get('/settings', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), settingsController.getSettings);
router.put('/settings/:key', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), settingsController.updateSetting);

// System settings (compat with frontend)
router.get('/system-settings', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), SystemSettingsController.getAllSettings);
router.post('/system-settings', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), SystemSettingsController.updateSetting);
router.post('/system-settings/bulk', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), SystemSettingsController.bulkUpdateSettings);
router.get('/system-settings/public', SystemSettingsController.getPublicSettings);

// Integrations (Global catalog + usage)
router.get('/integrations/catalog', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), IntegrationAdminController.getAll);
router.post('/integrations/global-config', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), IntegrationAdminController.upsert);
router.get('/integrations/usage', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), IntegrationAdminController.getUsage);
// Alias for frontend compatibility
router.get('/integrations', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), IntegrationAdminController.getAll);
router.post('/integrations', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), IntegrationAdminController.upsert);

// Company integration overrides
router.get('/integrations/company/:company_id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), companyIntegrationController.list);
router.post('/integrations/company/:company_id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), companyIntegrationController.create);
router.put('/integrations/company/:company_id/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), companyIntegrationController.update);
router.delete('/integrations/company/:company_id/:id', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), companyIntegrationController.remove);

// Finance Routes
router.get('/finance/invoices', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), financeController.getInvoices);
router.get('/finance/invoices/:id/download', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), financeController.downloadInvoice);
router.get('/finance/dunning', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), financeController.getDunning);
router.post('/finance/settlements/calculate', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), financeController.calculateSettlement);

// Capacity Routes
router.get('/consultants/capacity-warnings', authenticateHrm8, capacityController.getCapacityWarnings);

// System Alerts Routes
router.get('/alerts', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), alertController.getActiveAlerts);

// Messaging providers (email only)
router.get('/messaging/providers', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), messagingController.getProviders);

// Aliases for Frontend Compatibility
router.get('/finance/settlements', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), settlementController.getAll);
router.get('/revenue', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), revenueController.getAll);
router.get('/revenue/companies', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), revenueController.getCompanyBreakdown);
router.get('/pricing/books', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), pricingController.getPriceBooks);
router.get('/analytics/job-board/companies', authenticateHrm8, requireHrm8Role(['GLOBAL_ADMIN']), analyticsController.getJobBoardStats); // Job board company stats

export default router;
