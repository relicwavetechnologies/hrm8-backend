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
router.get('/commissions', authenticateHrm8, commissionController.getAll);
router.post('/commissions', authenticateHrm8, commissionController.create);
router.post('/commissions/pay', authenticateHrm8, commissionController.processPayments);
router.get('/commissions/regional', authenticateHrm8, commissionController.getRegional);
router.get('/commissions/:id', authenticateHrm8, commissionController.getById);
router.put('/commissions/:id/confirm', authenticateHrm8, commissionController.confirm);
router.put('/commissions/:id/pay', authenticateHrm8, commissionController.markAsPaid);

// Compliance Routes
router.get('/compliance/alerts', authenticateHrm8, complianceController.getAlerts);
router.get('/compliance/summary', authenticateHrm8, complianceController.getAlertSummary);
router.get('/compliance/audit/recent', authenticateHrm8, complianceController.getRecentAudit);
router.get('/compliance/audit/:entityType/:entityId', authenticateHrm8, complianceController.getAuditHistory);

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
router.post('/jobs/:jobId/auto-assign', authenticateHrm8, jobAllocationController.autoAssign);
router.get('/consultants/for-assignment', authenticateHrm8, jobAllocationController.getConsultantsForAssignment);

// Regional Licensee Routes
router.get('/regional-licensee', authenticateHrm8, regionalLicenseeController.getAll);
router.get('/regional-licensee/stats', authenticateHrm8, regionalLicenseeController.getStats);
router.get('/regional-licensee/:id', authenticateHrm8, regionalLicenseeController.getById);
router.post('/regional-licensee', authenticateHrm8, regionalLicenseeController.create);
router.put('/regional-licensee/:id', authenticateHrm8, regionalLicenseeController.update);
router.delete('/regional-licensee/:id', authenticateHrm8, regionalLicenseeController.delete);
router.put('/regional-licensee/:id/status', authenticateHrm8, regionalLicenseeController.updateStatus);
router.get('/regional-licensee/:id/impact-preview', authenticateHrm8, regionalLicenseeController.getImpactPreview);

// Legacy Alias for Frontend Compatibility
router.get('/licensees', authenticateHrm8, regionalLicenseeController.getAll);
router.get('/licensees/overview', authenticateHrm8, regionalLicenseeController.getOverview);
router.get('/licensees/stats', authenticateHrm8, regionalLicenseeController.getStats);
router.get('/licensees/:id', authenticateHrm8, regionalLicenseeController.getById);
router.post('/licensees', authenticateHrm8, regionalLicenseeController.create);
router.put('/licensees/:id', authenticateHrm8, regionalLicenseeController.update);
router.delete('/licensees/:id', authenticateHrm8, regionalLicenseeController.delete);
router.put('/licensees/:id/status', authenticateHrm8, regionalLicenseeController.updateStatus);
router.post('/licensees/:id/terminate', authenticateHrm8, regionalLicenseeController.terminate);
router.post('/licensees/:id/suspend', authenticateHrm8, (req, res, next) => {
    req.body.status = 'SUSPENDED';
    return regionalLicenseeController.updateStatus(req, res);
});
router.get('/licensees/:id/impact-preview', authenticateHrm8, regionalLicenseeController.getImpactPreview);

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
router.get('/pricing/products', authenticateHrm8, pricingController.getProducts);
router.post('/pricing/products', authenticateHrm8, pricingController.upsertProduct);
router.delete('/pricing/products/:id', authenticateHrm8, pricingController.deleteProduct);

router.get('/pricing/price-books', authenticateHrm8, pricingController.getPriceBooks);
router.post('/pricing/price-books', authenticateHrm8, pricingController.createPriceBook);
router.put('/pricing/price-books/:id', authenticateHrm8, pricingController.updatePriceBook);
router.delete('/pricing/price-books/:id', authenticateHrm8, pricingController.deletePriceBook);

router.post('/pricing/tiers/:priceBookId', authenticateHrm8, pricingController.createTier);
router.put('/pricing/tiers/:id', authenticateHrm8, pricingController.updateTier);
router.delete('/pricing/tiers/:id', authenticateHrm8, pricingController.deleteTier);

router.get('/pricing/promo-codes', authenticateHrm8, pricingController.getPromoCodes);
router.post('/pricing/promo-codes', authenticateHrm8, pricingController.createPromoCode);
router.put('/pricing/promo-codes/:id', authenticateHrm8, pricingController.updatePromoCode);
router.delete('/pricing/promo-codes/:id', authenticateHrm8, pricingController.deletePromoCode);
router.post('/pricing/promo-codes/validate', authenticateHrm8, pricingController.validatePromoCode);

// Region Routes
router.get('/regions', authenticateHrm8, regionController.getAll);
router.get('/regions/overview', authenticateHrm8, regionController.getOverview);
router.get('/regions/:id', authenticateHrm8, regionController.getById);
router.post('/regions', authenticateHrm8, regionController.create);
router.put('/regions/:id', authenticateHrm8, regionController.update);
router.delete('/regions/:id', authenticateHrm8, regionController.delete);
router.post('/regions/:regionId/assign-licensee', authenticateHrm8, regionController.assignLicensee);
router.post('/regions/:regionId/unassign-licensee', authenticateHrm8, regionController.unassignLicensee);
router.get('/regions/:regionId/transfer-impact', authenticateHrm8, regionController.getTransferImpact);
// Legacy alias for ATS compatibility
router.post('/regions/:regionId/transfer', authenticateHrm8, regionController.transferOwnership);
router.post('/regions/:regionId/transfer-ownership', authenticateHrm8, regionController.transferOwnership);

// Staff Management Routes
router.get('/consultants/overview', authenticateHrm8, staffController.getOverview);
router.get('/consultants', authenticateHrm8, staffController.getAll);
router.get('/consultants/:id', authenticateHrm8, staffController.getById);
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
router.get('/overview', authenticateHrm8, overviewController.getOverview);
router.get('/analytics/overview', authenticateHrm8, analyticsController.getPlatformOverview);
router.get('/analytics/trends', authenticateHrm8, analyticsController.getPlatformTrends);
router.get('/analytics/top-companies', authenticateHrm8, analyticsController.getTopCompanies);
router.get('/analytics/regional/:regionId/operational', authenticateHrm8, analyticsController.getOperationalStats);
router.get('/analytics/regional/:regionId/companies', authenticateHrm8, analyticsController.getRegionalCompanies);

// Regional Sales Routes
router.get('/sales/regional/opportunities', authenticateHrm8, regionalSalesController.getOpportunities);
router.get('/sales/regional/stats', authenticateHrm8, regionalSalesController.getStats);
router.get('/sales/regional/activities', authenticateHrm8, regionalSalesController.getActivities);
router.get('/leads/regional', authenticateHrm8, regionalSalesController.getLeads);
router.post('/leads/:leadId/reassign', authenticateHrm8, regionalSalesController.reassignLead);

// Revenue Routes
router.get('/revenue/regional', authenticateHrm8, revenueController.getAll);
router.get('/revenue/regional/:id', authenticateHrm8, revenueController.getById);
router.put('/revenue/regional/:id/confirm', authenticateHrm8, revenueController.confirm);
router.put('/revenue/regional/:id/pay', authenticateHrm8, revenueController.markAsPaid);
router.get('/revenue/analytics/company-breakdown', authenticateHrm8, revenueController.getCompanyBreakdown);
router.get('/revenue/dashboard', authenticateHrm8, revenueController.getDashboard);
router.get('/revenue/summary', authenticateHrm8, revenueController.getSummary);

// Withdrawal Routes
router.get('/admin/billing/withdrawals', authenticateHrm8, withdrawalController.getPendingWithdrawals);
router.post('/admin/billing/withdrawals/:id/approve', authenticateHrm8, withdrawalController.approve);
router.post('/admin/billing/withdrawals/:id/reject', authenticateHrm8, withdrawalController.reject);
router.post('/admin/billing/withdrawals/:id/process', authenticateHrm8, withdrawalController.processPayment);

// Settlement Routes
router.get('/admin/billing/settlements', authenticateHrm8, settlementController.getAll);
router.get('/admin/billing/settlements/stats', authenticateHrm8, settlementController.getStats);
router.put('/finance/settlements/:id/pay', authenticateHrm8, settlementController.markAsPaid); // Matching frontend error route

// Settings Routes
router.get('/settings/overview', authenticateHrm8, hrm8Controller.getSystemOverview);
router.get('/settings', authenticateHrm8, settingsController.getSettings);
router.put('/settings', authenticateHrm8, settingsController.updateSetting);

// Integrations Routes (HRM8 Settings Workspace)
router.get('/integrations/catalog', authenticateHrm8, hrm8IntegrationsController.getCatalog);
router.post('/integrations/global-config', authenticateHrm8, hrm8IntegrationsController.upsertGlobalConfig);
router.get('/integrations/usage', authenticateHrm8, hrm8IntegrationsController.getUsage);
router.get('/integrations/company/:companyId', authenticateHrm8, hrm8IntegrationsController.getCompanyIntegrations);
router.post('/integrations/company/:companyId', authenticateHrm8, hrm8IntegrationsController.createCompanyIntegration);
router.put('/integrations/company/:companyId/:id', authenticateHrm8, hrm8IntegrationsController.updateCompanyIntegration);
router.delete('/integrations/company/:companyId/:id', authenticateHrm8, hrm8IntegrationsController.deleteCompanyIntegration);

// Finance Routes
router.get('/finance/overview', authenticateHrm8, financeController.getOverview);
router.get('/finance/invoices', authenticateHrm8, financeController.getInvoices);
router.get('/finance/dunning', authenticateHrm8, financeController.getDunning);
router.post('/finance/settlements/calculate', authenticateHrm8, financeController.calculateSettlement);

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
