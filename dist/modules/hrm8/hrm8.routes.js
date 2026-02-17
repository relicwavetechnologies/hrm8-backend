"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const hrm8_controller_1 = require("./hrm8.controller");
const audit_log_controller_1 = require("./audit-log.controller");
const commission_controller_1 = require("./commission.controller");
const compliance_controller_1 = require("./compliance.controller");
const job_allocation_controller_1 = require("./job-allocation.controller");
const regional_licensee_controller_1 = require("./regional-licensee.controller");
const lead_conversion_controller_1 = require("./lead-conversion.controller");
const refund_controller_1 = require("./refund.controller");
const pricing_controller_1 = require("./pricing.controller");
const region_controller_1 = require("./region.controller");
const staff_controller_1 = require("./staff.controller");
const analytics_controller_1 = require("./analytics.controller");
const regional_sales_controller_1 = require("./regional-sales.controller");
const revenue_controller_1 = require("./revenue.controller");
const hrm8_integrations_controller_1 = require("./hrm8-integrations.controller");
const withdrawal_controller_1 = require("./withdrawal.controller");
const settlement_controller_1 = require("./settlement.controller");
const settings_controller_1 = require("./settings.controller");
const regional_company_controller_1 = require("./regional-company.controller");
const finance_controller_1 = require("./finance.controller");
const capacity_controller_1 = require("./capacity.controller");
const alert_controller_1 = require("./alert.controller");
const overview_controller_1 = require("./overview.controller");
const attribution_controller_1 = require("./attribution.controller");
const hrm8_auth_middleware_1 = require("../../middlewares/hrm8-auth.middleware");
const hrm8_auth_middleware_2 = require("../../middlewares/hrm8-auth.middleware");
const careers_request_controller_1 = require("./careers-request.controller");
const router = (0, express_1.Router)();
const hrm8Controller = new hrm8_controller_1.Hrm8Controller();
const auditLogController = new audit_log_controller_1.AuditLogController();
const commissionController = new commission_controller_1.CommissionController();
const complianceController = new compliance_controller_1.ComplianceController();
const jobAllocationController = new job_allocation_controller_1.JobAllocationController();
const regionalLicenseeController = new regional_licensee_controller_1.RegionalLicenseeController();
const regionalCompanyController = new regional_company_controller_1.RegionalCompanyController();
const leadConversionController = new lead_conversion_controller_1.LeadConversionController();
const refundController = new refund_controller_1.RefundController();
const pricingController = new pricing_controller_1.PricingController();
const regionController = new region_controller_1.RegionController();
const staffController = new staff_controller_1.StaffController();
const analyticsController = new analytics_controller_1.AnalyticsController();
const regionalSalesController = new regional_sales_controller_1.RegionalSalesController();
const revenueController = new revenue_controller_1.RevenueController();
const hrm8IntegrationsController = new hrm8_integrations_controller_1.Hrm8IntegrationsController();
const withdrawalController = new withdrawal_controller_1.WithdrawalController();
const settlementController = new settlement_controller_1.SettlementController();
const settingsController = new settings_controller_1.SettingsController();
const financeController = new finance_controller_1.FinanceController();
const capacityController = new capacity_controller_1.CapacityController();
const alertController = new alert_controller_1.AlertController();
const overviewController = new overview_controller_1.OverviewController();
const attributionController = new attribution_controller_1.AttributionController();
const careersRequestController = new careers_request_controller_1.CareersRequestController();
// Auth Routes
router.post('/auth/login', hrm8Controller.login);
router.post('/auth/logout', hrm8Controller.logout);
router.get('/auth/me', hrm8_auth_middleware_1.authenticateHrm8, hrm8Controller.getCurrentUser);
router.put('/auth/change-password', hrm8_auth_middleware_1.authenticateHrm8, hrm8Controller.changePassword);
router.get('/profile', hrm8_auth_middleware_1.authenticateHrm8, hrm8Controller.getProfileDetail);
router.put('/profile', hrm8_auth_middleware_1.authenticateHrm8, hrm8Controller.updateProfileDetail);
// Audit Log Routes
router.get('/audit-logs', hrm8_auth_middleware_1.authenticateHrm8, auditLogController.getRecent);
router.get('/audit-logs/stats', hrm8_auth_middleware_1.authenticateHrm8, auditLogController.getStats);
router.get('/audit-logs/:entityType/:entityId', hrm8_auth_middleware_1.authenticateHrm8, auditLogController.getByEntity);
// Commission Routes
router.get('/commissions', hrm8_auth_middleware_1.authenticateHrm8, commissionController.getAll);
router.post('/commissions', hrm8_auth_middleware_1.authenticateHrm8, commissionController.create);
router.post('/commissions/pay', hrm8_auth_middleware_1.authenticateHrm8, commissionController.processPayments);
router.get('/commissions/regional', hrm8_auth_middleware_1.authenticateHrm8, commissionController.getRegional);
router.get('/commissions/:id', hrm8_auth_middleware_1.authenticateHrm8, commissionController.getById);
router.put('/commissions/:id/confirm', hrm8_auth_middleware_1.authenticateHrm8, commissionController.confirm);
router.put('/commissions/:id/pay', hrm8_auth_middleware_1.authenticateHrm8, commissionController.markAsPaid);
// Compliance Routes
router.get('/compliance/alerts', hrm8_auth_middleware_1.authenticateHrm8, complianceController.getAlerts);
router.get('/compliance/summary', hrm8_auth_middleware_1.authenticateHrm8, complianceController.getAlertSummary);
router.get('/compliance/audit/recent', hrm8_auth_middleware_1.authenticateHrm8, complianceController.getRecentAudit);
router.get('/compliance/audit/:entityType/:entityId', hrm8_auth_middleware_1.authenticateHrm8, complianceController.getAuditHistory);
// Job Allocation Routes
router.get('/job-allocation/stats', hrm8_auth_middleware_1.authenticateHrm8, jobAllocationController.getStats);
router.post('/job-allocation', hrm8_auth_middleware_1.authenticateHrm8, jobAllocationController.allocate);
router.get('/job-allocation/licensee/:id', hrm8_auth_middleware_1.authenticateHrm8, jobAllocationController.getByLicensee);
router.delete('/job-allocation/:id', hrm8_auth_middleware_1.authenticateHrm8, jobAllocationController.deallocate);
router.post('/jobs/:jobId/assign-consultant', hrm8_auth_middleware_1.authenticateHrm8, jobAllocationController.assignConsultant);
router.post('/jobs/:jobId/assign-region', hrm8_auth_middleware_1.authenticateHrm8, jobAllocationController.assignRegion);
router.post('/jobs/:jobId/unassign', hrm8_auth_middleware_1.authenticateHrm8, jobAllocationController.unassign);
router.get('/jobs/:jobId/consultants', hrm8_auth_middleware_1.authenticateHrm8, jobAllocationController.getJobConsultants);
router.get('/jobs/:jobId/assignment-info', hrm8_auth_middleware_1.authenticateHrm8, jobAllocationController.getAssignmentInfo);
router.get('/jobs/allocation', hrm8_auth_middleware_1.authenticateHrm8, jobAllocationController.getJobsForAllocation);
router.get('/jobs/detail/:jobId', hrm8_auth_middleware_1.authenticateHrm8, jobAllocationController.getJobDetail);
router.post('/jobs/:jobId/auto-assign', hrm8_auth_middleware_1.authenticateHrm8, jobAllocationController.autoAssign);
router.get('/consultants/for-assignment', hrm8_auth_middleware_1.authenticateHrm8, jobAllocationController.getConsultantsForAssignment);
// Regional Licensee Routes
router.get('/regional-licensee', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionalLicenseeController.getAll);
router.get('/regional-licensee/stats', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionalLicenseeController.getStats);
router.get('/regional-licensee/:id', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionalLicenseeController.getById);
router.post('/regional-licensee', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.create);
router.put('/regional-licensee/:id', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.update);
router.delete('/regional-licensee/:id', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.delete);
router.put('/regional-licensee/:id/status', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.updateStatus);
router.post('/regional-licensee/:id/suspend', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.suspend);
router.post('/regional-licensee/:id/reactivate', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.reactivate);
router.post('/regional-licensee/:id/terminate', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.terminate);
router.get('/regional-licensee/:id/impact-preview', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.getImpactPreview);
// Legacy Alias for Frontend Compatibility
router.get('/licensees', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionalLicenseeController.getAll);
router.get('/licensees/overview', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionalLicenseeController.getOverview);
router.get('/licensees/stats', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionalLicenseeController.getStats);
router.get('/licensees/:id', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionalLicenseeController.getById);
router.post('/licensees', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.create);
router.put('/licensees/:id', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.update);
router.delete('/licensees/:id', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.delete);
router.put('/licensees/:id/status', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.updateStatus);
router.post('/licensees/:id/suspend', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.suspend);
router.post('/licensees/:id/reactivate', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.reactivate);
router.post('/licensees/:id/terminate', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.terminate);
router.get('/licensees/:id/impact-preview', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionalLicenseeController.getImpactPreview);
// Company Routes
router.get('/companies/:id', hrm8_auth_middleware_1.authenticateHrm8, regionalCompanyController.getById);
router.get('/companies/:id/jobs', hrm8_auth_middleware_1.authenticateHrm8, regionalCompanyController.getCompanyJobs);
// Lead Conversion Routes
router.get('/conversion-requests', hrm8_auth_middleware_1.authenticateHrm8, leadConversionController.getAll);
router.get('/conversion-requests/:id', hrm8_auth_middleware_1.authenticateHrm8, leadConversionController.getOne);
router.put('/conversion-requests/:id/approve', hrm8_auth_middleware_1.authenticateHrm8, leadConversionController.approve);
router.put('/conversion-requests/:id/decline', hrm8_auth_middleware_1.authenticateHrm8, leadConversionController.decline);
// Careers Request Routes
router.get('/careers/requests', hrm8_auth_middleware_1.authenticateHrm8, careersRequestController.getRequests);
router.post('/careers/:id/approve', hrm8_auth_middleware_1.authenticateHrm8, careersRequestController.approve);
router.post('/careers/:id/reject', hrm8_auth_middleware_1.authenticateHrm8, careersRequestController.reject);
// Refund Routes
router.get('/refund-requests', hrm8_auth_middleware_1.authenticateHrm8, refundController.getAll);
router.put('/refund-requests/:id/approve', hrm8_auth_middleware_1.authenticateHrm8, refundController.approve);
router.put('/refund-requests/:id/reject', hrm8_auth_middleware_1.authenticateHrm8, refundController.reject);
router.put('/refund-requests/:id/complete', hrm8_auth_middleware_1.authenticateHrm8, refundController.complete);
// Pricing Routes
router.get('/pricing/products', hrm8_auth_middleware_1.authenticateHrm8, pricingController.getProducts);
router.post('/pricing/products', hrm8_auth_middleware_1.authenticateHrm8, pricingController.upsertProduct);
router.delete('/pricing/products/:id', hrm8_auth_middleware_1.authenticateHrm8, pricingController.deleteProduct);
router.get('/pricing/price-books', hrm8_auth_middleware_1.authenticateHrm8, pricingController.getPriceBooks);
router.post('/pricing/price-books', hrm8_auth_middleware_1.authenticateHrm8, pricingController.createPriceBook);
router.put('/pricing/price-books/:id', hrm8_auth_middleware_1.authenticateHrm8, pricingController.updatePriceBook);
router.delete('/pricing/price-books/:id', hrm8_auth_middleware_1.authenticateHrm8, pricingController.deletePriceBook);
router.post('/pricing/tiers/:priceBookId', hrm8_auth_middleware_1.authenticateHrm8, pricingController.createTier);
router.put('/pricing/tiers/:id', hrm8_auth_middleware_1.authenticateHrm8, pricingController.updateTier);
router.delete('/pricing/tiers/:id', hrm8_auth_middleware_1.authenticateHrm8, pricingController.deleteTier);
router.get('/pricing/promo-codes', hrm8_auth_middleware_1.authenticateHrm8, pricingController.getPromoCodes);
router.post('/pricing/promo-codes', hrm8_auth_middleware_1.authenticateHrm8, pricingController.createPromoCode);
router.put('/pricing/promo-codes/:id', hrm8_auth_middleware_1.authenticateHrm8, pricingController.updatePromoCode);
router.delete('/pricing/promo-codes/:id', hrm8_auth_middleware_1.authenticateHrm8, pricingController.deletePromoCode);
router.post('/pricing/promo-codes/validate', hrm8_auth_middleware_1.authenticateHrm8, pricingController.validatePromoCode);
// Region Routes
router.get('/regions', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionController.getAll);
router.get('/regions/overview', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionController.getOverview);
router.get('/regions/:id', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN', 'REGIONAL_LICENSEE']), regionController.getById);
router.post('/regions', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionController.create);
router.put('/regions/:id', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionController.update);
router.delete('/regions/:id', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionController.delete);
router.post('/regions/:regionId/assign-licensee', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionController.assignLicensee);
router.post('/regions/:regionId/unassign-licensee', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionController.unassignLicensee);
router.get('/regions/:regionId/transfer-impact', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionController.getTransferImpact);
// Legacy alias for ATS compatibility
router.post('/regions/:regionId/transfer', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionController.transferOwnership);
router.post('/regions/:regionId/transfer-ownership', hrm8_auth_middleware_1.authenticateHrm8, (0, hrm8_auth_middleware_2.requireHrm8Role)(['GLOBAL_ADMIN']), regionController.transferOwnership);
// Staff Management Routes
router.get('/consultants/overview', hrm8_auth_middleware_1.authenticateHrm8, staffController.getOverview);
router.get('/consultants', hrm8_auth_middleware_1.authenticateHrm8, staffController.getAll);
router.get('/consultants/:id', hrm8_auth_middleware_1.authenticateHrm8, staffController.getById);
router.post('/consultants', hrm8_auth_middleware_1.authenticateHrm8, staffController.create);
router.put('/consultants/:id', hrm8_auth_middleware_1.authenticateHrm8, staffController.update);
router.post('/consultants/:id/assign-region', hrm8_auth_middleware_1.authenticateHrm8, staffController.assignRegion);
router.post('/consultants/:id/suspend', hrm8_auth_middleware_1.authenticateHrm8, staffController.suspend);
router.post('/consultants/:id/reactivate', hrm8_auth_middleware_1.authenticateHrm8, staffController.reactivate);
router.delete('/consultants/:id', hrm8_auth_middleware_1.authenticateHrm8, staffController.delete);
router.post('/consultants/generate-email', hrm8_auth_middleware_1.authenticateHrm8, staffController.generateEmail);
router.post('/consultants/:id/reassign-jobs', hrm8_auth_middleware_1.authenticateHrm8, staffController.reassignJobs);
router.get('/consultants/:id/pending-tasks', hrm8_auth_middleware_1.authenticateHrm8, staffController.getPendingTasks);
router.get('/consultants/:id/reassignment-options', hrm8_auth_middleware_1.authenticateHrm8, staffController.getReassignmentOptions);
router.put('/consultants/:id/change-role', hrm8_auth_middleware_1.authenticateHrm8, staffController.changeRole);
router.post('/consultants/:id/invite', hrm8_auth_middleware_1.authenticateHrm8, staffController.invite);
// Analytics Routes
router.get('/overview', hrm8_auth_middleware_1.authenticateHrm8, overviewController.getOverview);
router.get('/analytics/overview', hrm8_auth_middleware_1.authenticateHrm8, analyticsController.getPlatformOverview);
router.get('/analytics/trends', hrm8_auth_middleware_1.authenticateHrm8, analyticsController.getPlatformTrends);
router.get('/analytics/top-companies', hrm8_auth_middleware_1.authenticateHrm8, analyticsController.getTopCompanies);
router.get('/analytics/regional/:regionId/operational', hrm8_auth_middleware_1.authenticateHrm8, analyticsController.getOperationalStats);
router.get('/analytics/regional/:regionId/companies', hrm8_auth_middleware_1.authenticateHrm8, analyticsController.getRegionalCompanies);
// Regional Sales Routes
router.get('/sales/regional/opportunities', hrm8_auth_middleware_1.authenticateHrm8, regionalSalesController.getOpportunities);
router.get('/sales/regional/stats', hrm8_auth_middleware_1.authenticateHrm8, regionalSalesController.getStats);
router.get('/sales/regional/activities', hrm8_auth_middleware_1.authenticateHrm8, regionalSalesController.getActivities);
router.get('/leads/regional', hrm8_auth_middleware_1.authenticateHrm8, regionalSalesController.getLeads);
router.post('/leads/:leadId/reassign', hrm8_auth_middleware_1.authenticateHrm8, regionalSalesController.reassignLead);
// Revenue Routes
router.get('/revenue/regional', hrm8_auth_middleware_1.authenticateHrm8, revenueController.getAll);
router.get('/revenue/regional/:id', hrm8_auth_middleware_1.authenticateHrm8, revenueController.getById);
router.put('/revenue/regional/:id/confirm', hrm8_auth_middleware_1.authenticateHrm8, revenueController.confirm);
router.put('/revenue/regional/:id/pay', hrm8_auth_middleware_1.authenticateHrm8, revenueController.markAsPaid);
router.get('/revenue/analytics/company-breakdown', hrm8_auth_middleware_1.authenticateHrm8, revenueController.getCompanyBreakdown);
router.get('/revenue/dashboard', hrm8_auth_middleware_1.authenticateHrm8, revenueController.getDashboard);
router.get('/revenue/summary', hrm8_auth_middleware_1.authenticateHrm8, revenueController.getSummary);
// Withdrawal Routes
router.get('/admin/billing/withdrawals', hrm8_auth_middleware_1.authenticateHrm8, withdrawalController.getPendingWithdrawals);
router.post('/admin/billing/withdrawals/:id/approve', hrm8_auth_middleware_1.authenticateHrm8, withdrawalController.approve);
router.post('/admin/billing/withdrawals/:id/reject', hrm8_auth_middleware_1.authenticateHrm8, withdrawalController.reject);
router.post('/admin/billing/withdrawals/:id/process', hrm8_auth_middleware_1.authenticateHrm8, withdrawalController.processPayment);
// Settlement Routes
router.get('/admin/billing/settlements', hrm8_auth_middleware_1.authenticateHrm8, settlementController.getAll);
router.get('/admin/billing/settlements/stats', hrm8_auth_middleware_1.authenticateHrm8, settlementController.getStats);
router.put('/finance/settlements/:id/pay', hrm8_auth_middleware_1.authenticateHrm8, settlementController.markAsPaid); // Matching frontend error route
// Settings Routes
router.get('/settings/overview', hrm8_auth_middleware_1.authenticateHrm8, hrm8Controller.getSystemOverview);
router.get('/settings', hrm8_auth_middleware_1.authenticateHrm8, settingsController.getSettings);
router.put('/settings', hrm8_auth_middleware_1.authenticateHrm8, settingsController.updateSetting);
// Integrations Routes (HRM8 Settings Workspace)
router.get('/integrations/catalog', hrm8_auth_middleware_1.authenticateHrm8, hrm8IntegrationsController.getCatalog);
router.post('/integrations/global-config', hrm8_auth_middleware_1.authenticateHrm8, hrm8IntegrationsController.upsertGlobalConfig);
router.get('/integrations/usage', hrm8_auth_middleware_1.authenticateHrm8, hrm8IntegrationsController.getUsage);
router.get('/integrations/company/:companyId', hrm8_auth_middleware_1.authenticateHrm8, hrm8IntegrationsController.getCompanyIntegrations);
router.post('/integrations/company/:companyId', hrm8_auth_middleware_1.authenticateHrm8, hrm8IntegrationsController.createCompanyIntegration);
router.put('/integrations/company/:companyId/:id', hrm8_auth_middleware_1.authenticateHrm8, hrm8IntegrationsController.updateCompanyIntegration);
router.delete('/integrations/company/:companyId/:id', hrm8_auth_middleware_1.authenticateHrm8, hrm8IntegrationsController.deleteCompanyIntegration);
// Finance Routes
router.get('/finance/overview', hrm8_auth_middleware_1.authenticateHrm8, financeController.getOverview);
router.get('/finance/invoices', hrm8_auth_middleware_1.authenticateHrm8, financeController.getInvoices);
router.get('/finance/dunning', hrm8_auth_middleware_1.authenticateHrm8, financeController.getDunning);
router.post('/finance/settlements/calculate', hrm8_auth_middleware_1.authenticateHrm8, financeController.calculateSettlement);
// Capacity Routes
router.get('/consultants/capacity-warnings', hrm8_auth_middleware_1.authenticateHrm8, capacityController.getCapacityWarnings);
// System Alerts Routes
router.get('/alerts', hrm8_auth_middleware_1.authenticateHrm8, alertController.getActiveAlerts);
// Attribution Routes
router.get('/attribution/companies/search', hrm8_auth_middleware_1.authenticateHrm8, attributionController.searchCompanies);
router.get('/attribution/:companyId', hrm8_auth_middleware_1.authenticateHrm8, attributionController.getAttribution);
router.get('/attribution/:companyId/history', hrm8_auth_middleware_1.authenticateHrm8, attributionController.getAttributionHistory);
router.post('/attribution/:companyId/lock', hrm8_auth_middleware_1.authenticateHrm8, attributionController.lockAttribution);
router.post('/attribution/:companyId/override', hrm8_auth_middleware_1.authenticateHrm8, attributionController.overrideAttribution);
// Aliases for Frontend Compatibility
router.get('/finance/settlements', hrm8_auth_middleware_1.authenticateHrm8, settlementController.getAll);
router.get('/revenue', hrm8_auth_middleware_1.authenticateHrm8, revenueController.getAll);
router.get('/revenue/companies', hrm8_auth_middleware_1.authenticateHrm8, revenueController.getCompanyBreakdown);
router.get('/pricing/books', hrm8_auth_middleware_1.authenticateHrm8, pricingController.getPriceBooks);
router.get('/jobs/companies', hrm8_auth_middleware_1.authenticateHrm8, analyticsController.getJobBoardStats); // Job board company stats
exports.default = router;
