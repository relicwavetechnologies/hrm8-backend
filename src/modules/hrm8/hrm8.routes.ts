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
router.get('/audit-logs', authenticateHrm8, auditLogController.getRecent as any as any);
router.get('/audit-logs/stats', authenticateHrm8, auditLogController.getStats as any as any);
router.get('/audit-logs/:entityType/:entityId', authenticateHrm8, auditLogController.getByEntity as any as any);

// Commission Routes
router.get('/commissions', authenticateHrm8, commissionController.getAll as any as any);
router.post('/commissions', authenticateHrm8, commissionController.create as any as any);
router.post('/commissions/pay', authenticateHrm8, commissionController.processPayments as any as any);
router.get('/commissions/regional', authenticateHrm8, commissionController.getRegional as any as any);
router.get('/commissions/:id', authenticateHrm8, commissionController.getById as any as any);
router.put('/commissions/:id/confirm', authenticateHrm8, commissionController.confirm as any as any);
router.put('/commissions/:id/pay', authenticateHrm8, commissionController.markAsPaid as any as any);

// Compliance Routes
router.get('/compliance/alerts', authenticateHrm8, complianceController.getAlerts as any as any);
router.get('/compliance/summary', authenticateHrm8, complianceController.getAlertSummary as any as any);
router.get('/compliance/audit/recent', authenticateHrm8, complianceController.getRecentAudit as any as any);
router.get('/compliance/audit/:entityType/:entityId', authenticateHrm8, complianceController.getAuditHistory as any as any);

// Job Allocation Routes
router.get('/job-allocation/stats', authenticateHrm8, jobAllocationController.getStats as any as any);
router.post('/job-allocation', authenticateHrm8, jobAllocationController.allocate as any as any);
router.get('/job-allocation/licensee/:id', authenticateHrm8, jobAllocationController.getByLicensee as any as any);
router.delete('/job-allocation/:id', authenticateHrm8, jobAllocationController.deallocate as any as any);

router.post('/jobs/:jobId/assign-consultant', authenticateHrm8, jobAllocationController.assignConsultant as any as any);
router.post('/jobs/:jobId/assign-region', authenticateHrm8, jobAllocationController.assignRegion as any as any);
router.post('/jobs/:jobId/unassign', authenticateHrm8, jobAllocationController.unassign as any as any);
router.get('/jobs/:jobId/consultants', authenticateHrm8, jobAllocationController.getJobConsultants as any as any);
router.get('/jobs/:jobId/assignment-info', authenticateHrm8, jobAllocationController.getAssignmentInfo as any as any);
router.get('/jobs/allocation', authenticateHrm8, jobAllocationController.getJobsForAllocation as any as any);
router.get('/jobs/detail/:jobId', authenticateHrm8, jobAllocationController.getJobDetail as any as any);
router.post('/jobs/:jobId/auto-assign', authenticateHrm8, jobAllocationController.autoAssign as any as any);
router.get('/consultants/for-assignment', authenticateHrm8, jobAllocationController.getConsultantsForAssignment as any as any);

// Regional Licensee Routes
router.get('/regional-licensee', authenticateHrm8, regionalLicenseeController.getAll as any as any);
router.get('/regional-licensee/stats', authenticateHrm8, regionalLicenseeController.getStats as any as any);
router.get('/regional-licensee/:id', authenticateHrm8, regionalLicenseeController.getById as any as any);
router.post('/regional-licensee', authenticateHrm8, regionalLicenseeController.create as any as any);
router.put('/regional-licensee/:id', authenticateHrm8, regionalLicenseeController.update as any as any);
router.delete('/regional-licensee/:id', authenticateHrm8, regionalLicenseeController.delete as any as any);
router.put('/regional-licensee/:id/status', authenticateHrm8, regionalLicenseeController.updateStatus as any as any);
router.get('/regional-licensee/:id/impact-preview', authenticateHrm8, regionalLicenseeController.getImpactPreview as any as any);

// Legacy Alias for Frontend Compatibility
router.get('/licensees', authenticateHrm8, regionalLicenseeController.getAll as any as any);
router.get('/licensees/overview', authenticateHrm8, regionalLicenseeController.getOverview as any as any);
router.get('/licensees/stats', authenticateHrm8, regionalLicenseeController.getStats as any as any);
router.get('/licensees/:id', authenticateHrm8, regionalLicenseeController.getById as any as any);
router.post('/licensees', authenticateHrm8, regionalLicenseeController.create as any as any);
router.put('/licensees/:id', authenticateHrm8, regionalLicenseeController.update as any as any);
router.delete('/licensees/:id', authenticateHrm8, regionalLicenseeController.delete as any as any);
router.put('/licensees/:id/status', authenticateHrm8, regionalLicenseeController.updateStatus as any as any);
router.post('/licensees/:id/terminate', authenticateHrm8, regionalLicenseeController.terminate as any as any);
router.post('/licensees/:id/suspend', authenticateHrm8, (req, res, next) => {
    req.body.status = 'SUSPENDED';
    return (regionalLicenseeController.updateStatus as any as any)(req, res);
});
router.get('/licensees/:id/impact-preview', authenticateHrm8, regionalLicenseeController.getImpactPreview as any as any);

// Company Routes
router.get('/companies/:id', authenticateHrm8, regionalCompanyController.getById as any as any);
router.get('/companies/:id/jobs', authenticateHrm8, regionalCompanyController.getCompanyJobs as any as any);

// Lead Conversion Routes
router.get('/conversion-requests', authenticateHrm8, leadConversionController.getAll as any as any);
router.get('/conversion-requests/:id', authenticateHrm8, leadConversionController.getOne as any as any);
router.put('/conversion-requests/:id/approve', authenticateHrm8, leadConversionController.approve as any as any);
router.put('/conversion-requests/:id/decline', authenticateHrm8, leadConversionController.decline as any as any);

// Careers Request Routes
router.get('/careers/requests', authenticateHrm8, careersRequestController.getRequests as any as any);
router.post('/careers/:id/approve', authenticateHrm8, careersRequestController.approve as any as any);
router.post('/careers/:id/reject', authenticateHrm8, careersRequestController.reject as any as any);

// Refund Routes
router.get('/refund-requests', authenticateHrm8, refundController.getAll as any as any);
router.put('/refund-requests/:id/approve', authenticateHrm8, refundController.approve as any as any);
router.put('/refund-requests/:id/reject', authenticateHrm8, refundController.reject as any as any);
router.put('/refund-requests/:id/complete', authenticateHrm8, refundController.complete as any as any);

// Pricing Routes
router.get('/pricing/products', authenticateHrm8, pricingController.getProducts as any as any);
router.post('/pricing/products', authenticateHrm8, pricingController.upsertProduct as any as any);
router.delete('/pricing/products/:id', authenticateHrm8, pricingController.deleteProduct as any as any);

router.get('/pricing/price-books', authenticateHrm8, pricingController.getPriceBooks as any as any);
router.post('/pricing/price-books', authenticateHrm8, pricingController.createPriceBook as any as any);
router.put('/pricing/price-books/:id', authenticateHrm8, pricingController.updatePriceBook as any as any);
router.delete('/pricing/price-books/:id', authenticateHrm8, pricingController.deletePriceBook as any as any);

router.post('/pricing/tiers/:priceBookId', authenticateHrm8, pricingController.createTier as any as any);
router.put('/pricing/tiers/:id', authenticateHrm8, pricingController.updateTier as any as any);
router.delete('/pricing/tiers/:id', authenticateHrm8, pricingController.deleteTier as any as any);

router.get('/pricing/promo-codes', authenticateHrm8, pricingController.getPromoCodes as any as any);
router.post('/pricing/promo-codes', authenticateHrm8, pricingController.createPromoCode as any as any);
router.put('/pricing/promo-codes/:id', authenticateHrm8, pricingController.updatePromoCode as any as any);
router.delete('/pricing/promo-codes/:id', authenticateHrm8, pricingController.deletePromoCode as any as any);
router.post('/pricing/promo-codes/validate', authenticateHrm8, pricingController.validatePromoCode as any as any);

// Region Routes
router.get('/regions', authenticateHrm8, regionController.getAll as any as any);
router.get('/regions/overview', authenticateHrm8, regionController.getOverview as any as any);
router.get('/regions/:id', authenticateHrm8, regionController.getById as any as any);
router.post('/regions', authenticateHrm8, regionController.create as any as any);
router.put('/regions/:id', authenticateHrm8, regionController.update as any as any);
router.delete('/regions/:id', authenticateHrm8, regionController.delete as any as any);
router.post('/regions/:regionId/assign-licensee', authenticateHrm8, regionController.assignLicensee as any as any);
router.post('/regions/:regionId/unassign-licensee', authenticateHrm8, regionController.unassignLicensee as any as any);
router.get('/regions/:regionId/transfer-impact', authenticateHrm8, regionController.getTransferImpact as any as any);
// Legacy alias for ATS compatibility
router.post('/regions/:regionId/transfer', authenticateHrm8, regionController.transferOwnership as any as any);
router.post('/regions/:regionId/transfer-ownership', authenticateHrm8, regionController.transferOwnership as any as any);

// Staff Management Routes
router.get('/consultants/overview', authenticateHrm8, staffController.getOverview as any as any);
router.get('/consultants', authenticateHrm8, staffController.getAll as any as any);
router.get('/consultants/:id', authenticateHrm8, staffController.getById as any as any);
router.post('/consultants', authenticateHrm8, staffController.create as any as any);
router.put('/consultants/:id', authenticateHrm8, staffController.update as any as any);
router.post('/consultants/:id/assign-region', authenticateHrm8, staffController.assignRegion as any as any);
router.post('/consultants/:id/suspend', authenticateHrm8, staffController.suspend as any as any);
router.post('/consultants/:id/reactivate', authenticateHrm8, staffController.reactivate as any as any);
router.delete('/consultants/:id', authenticateHrm8, staffController.delete as any as any);
router.post('/consultants/generate-email', authenticateHrm8, staffController.generateEmail as any as any);
router.post('/consultants/:id/reassign-jobs', authenticateHrm8, staffController.reassignJobs as any as any);
router.get('/consultants/:id/pending-tasks', authenticateHrm8, staffController.getPendingTasks as any as any);
router.get('/consultants/:id/reassignment-options', authenticateHrm8, staffController.getReassignmentOptions as any as any);
router.put('/consultants/:id/change-role', authenticateHrm8, staffController.changeRole as any as any);
router.post('/consultants/:id/invite', authenticateHrm8, staffController.invite as any as any);

// Analytics Routes
router.get('/overview', authenticateHrm8, overviewController.getOverview as any as any);
router.get('/analytics/overview', authenticateHrm8, analyticsController.getPlatformOverview as any as any);
router.get('/analytics/trends', authenticateHrm8, analyticsController.getPlatformTrends as any as any);
router.get('/analytics/top-companies', authenticateHrm8, analyticsController.getTopCompanies as any as any);
router.get('/analytics/regional/:regionId/operational', authenticateHrm8, analyticsController.getOperationalStats as any as any);
router.get('/analytics/regional/:regionId/companies', authenticateHrm8, analyticsController.getRegionalCompanies as any as any);

// Regional Sales Routes
router.get('/sales/regional/opportunities', authenticateHrm8, regionalSalesController.getOpportunities as any as any);
router.get('/sales/regional/stats', authenticateHrm8, regionalSalesController.getStats as any as any);
router.get('/sales/regional/activities', authenticateHrm8, regionalSalesController.getActivities as any as any);
router.get('/leads/regional', authenticateHrm8, regionalSalesController.getLeads as any as any);
router.post('/leads/:leadId/reassign', authenticateHrm8, regionalSalesController.reassignLead as any as any);

// Revenue Routes
router.get('/revenue/regional', authenticateHrm8, revenueController.getAll as any as any);
router.get('/revenue/regional/:id', authenticateHrm8, revenueController.getById as any as any);
router.put('/revenue/regional/:id/confirm', authenticateHrm8, revenueController.confirm as any as any);
router.put('/revenue/regional/:id/pay', authenticateHrm8, revenueController.markAsPaid as any as any);
router.get('/revenue/analytics/company-breakdown', authenticateHrm8, revenueController.getCompanyBreakdown as any as any);
router.get('/revenue/dashboard', authenticateHrm8, revenueController.getDashboard as any as any);
router.get('/revenue/summary', authenticateHrm8, revenueController.getSummary as any as any);

// Withdrawal Routes
router.get('/admin/billing/withdrawals', authenticateHrm8, withdrawalController.getPendingWithdrawals as any as any);
router.post('/admin/billing/withdrawals/:id/approve', authenticateHrm8, withdrawalController.approve as any as any);
router.post('/admin/billing/withdrawals/:id/reject', authenticateHrm8, withdrawalController.reject as any as any);
router.post('/admin/billing/withdrawals/:id/process', authenticateHrm8, withdrawalController.processPayment as any as any);

// Settlement Routes
router.get('/admin/billing/settlements', authenticateHrm8, settlementController.getAll as any as any);
router.get('/admin/billing/settlements/stats', authenticateHrm8, settlementController.getStats as any as any);
router.put('/finance/settlements/:id/pay', authenticateHrm8, settlementController.markAsPaid as any as any); // Matching frontend error route

// Settings Routes
router.get('/settings/overview', authenticateHrm8, hrm8Controller.getSystemOverview);
router.get('/settings', authenticateHrm8, settingsController.getSettings as any as any);
router.put('/settings', authenticateHrm8, settingsController.updateSetting as any as any);

// Integrations Routes (HRM8 Settings Workspace)
router.get('/integrations/catalog', authenticateHrm8, hrm8IntegrationsController.getCatalog as any as any);
router.post('/integrations/global-config', authenticateHrm8, hrm8IntegrationsController.upsertGlobalConfig as any as any);
router.get('/integrations/usage', authenticateHrm8, hrm8IntegrationsController.getUsage as any as any);
router.get('/integrations/company/:companyId', authenticateHrm8, hrm8IntegrationsController.getCompanyIntegrations as any as any);
router.post('/integrations/company/:companyId', authenticateHrm8, hrm8IntegrationsController.createCompanyIntegration as any as any);
router.put('/integrations/company/:companyId/:id', authenticateHrm8, hrm8IntegrationsController.updateCompanyIntegration as any as any);
router.delete('/integrations/company/:companyId/:id', authenticateHrm8, hrm8IntegrationsController.deleteCompanyIntegration as any as any);

// Finance Routes
router.get('/finance/overview', authenticateHrm8, financeController.getOverview as any as any);
router.get('/finance/invoices', authenticateHrm8, financeController.getInvoices as any as any);
router.get('/finance/dunning', authenticateHrm8, financeController.getDunning as any as any);
router.post('/finance/settlements/calculate', authenticateHrm8, financeController.calculateSettlement as any as any);

// Capacity Routes
router.get('/consultants/capacity-warnings', authenticateHrm8, capacityController.getCapacityWarnings as any as any);

// System Alerts Routes
router.get('/alerts', authenticateHrm8, alertController.getActiveAlerts as any as any);

// Attribution Routes
router.get('/attribution/companies/search', authenticateHrm8, attributionController.searchCompanies as any as any);
router.get('/attribution/:companyId', authenticateHrm8, attributionController.getAttribution as any as any);
router.get('/attribution/:companyId/history', authenticateHrm8, attributionController.getAttributionHistory as any as any);
router.post('/attribution/:companyId/lock', authenticateHrm8, attributionController.lockAttribution as any as any);
router.post('/attribution/:companyId/override', authenticateHrm8, attributionController.overrideAttribution as any as any);

// Aliases for Frontend Compatibility
router.get('/finance/settlements', authenticateHrm8, settlementController.getAll as any as any);
router.get('/revenue', authenticateHrm8, revenueController.getAll as any as any);
router.get('/revenue/companies', authenticateHrm8, revenueController.getCompanyBreakdown as any as any);
router.get('/pricing/books', authenticateHrm8, pricingController.getPriceBooks as any as any);
router.get('/jobs/companies', authenticateHrm8, analyticsController.getJobBoardStats as any as any); // Job board company stats

export default router;
