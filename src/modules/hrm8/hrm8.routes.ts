import { Router } from 'express';
import { Hrm8Controller } from './hrm8.controller';
import { RegionController } from './region.controller';
import { FinanceController } from './finance.controller';
import { AdminOpsController } from './admin-ops.controller';
import { SystemController } from './system.controller';
import { ConsultantAdminController } from './consultant-admin.controller';
import { JobAllocationController } from './job-allocation.controller';
import { AuditLogController } from './audit-log.controller';
import { authenticateHrm8 as authenticateHrm8User } from '../../middlewares/hrm8-auth.middleware';

const router = Router();
const hrm8Controller = new Hrm8Controller();
const regionController = new RegionController();
const financeController = new FinanceController();
const opsController = new AdminOpsController();
const systemController = new SystemController();
const consultantAdminController = new ConsultantAdminController();
const jobAllocationController = new JobAllocationController();
const auditLogController = new AuditLogController();

// --- Auth (Public) ---
router.post('/auth/login', hrm8Controller.login);
router.get('/system-settings/public', systemController.getSettings); // Assuming public settings are same endpoint logic for now

// --- Protected Routes ---
router.use(authenticateHrm8User); // Middleware to ensure HRM8 User session

// Auth
router.post('/auth/logout', hrm8Controller.logout);
router.get('/auth/me', hrm8Controller.getCurrentUser);

// --- Regions ---
router.get('/regions', regionController.getAll);
router.post('/regions', regionController.create);
router.get('/regions/:id', regionController.getById);
router.put('/regions/:id', regionController.update);
router.delete('/regions/:id', regionController.delete);
router.post('/regions/:id/assign-licensee', regionController.assignLicensee);
router.post('/regions/:id/unassign-licensee', regionController.unassignLicensee);

// --- Licensees ---
router.get('/licensees', regionController.getAllLicensees);
router.post('/licensees', regionController.createLicensee);
router.get('/licensees/:id', regionController.getLicensee);
router.put('/licensees/:id', regionController.updateLicensee);
router.post('/licensees/:id/suspend', regionController.suspendLicensee);
router.post('/licensees/:id/terminate', regionController.terminateLicensee);
router.delete('/licensees/:id', regionController.deleteLicensee);

// --- Consultants & Jobs ---
router.get('/consultants', consultantAdminController.getAll);
router.post('/consultants', consultantAdminController.create);
router.put('/consultants/:id', consultantAdminController.update);

// --- Jobs Allocation ---
router.get('/jobs/:jobId/assignment-info', jobAllocationController.getAssignmentInfo);
router.post('/jobs/:jobId/assign-consultant', jobAllocationController.assignConsultant);
router.post('/jobs/:jobId/assign-region', jobAllocationController.assignRegion);
router.post('/jobs/:jobId/unassign', jobAllocationController.unassign);

// --- Finance: Commissions ---
// --- Finance: Commissions ---
router.get('/commissions', financeController.getCommissions);
router.get('/commissions/regional', financeController.getRegionalCommissions); // Specific path before parameter
router.post('/commissions', financeController.createCommission);
router.get('/commissions/:id', financeController.getCommissionById);
router.put('/commissions/:id/confirm', financeController.confirmCommission);
router.put('/commissions/:id/pay', financeController.markCommissionPaid);

// --- Finance: Revenue ---
router.get('/revenue', financeController.getRevenueSummary);
router.get('/revenue/region/:regionId', financeController.getRevenueByRegion);
router.post('/revenue/region/:regionId/calculate', financeController.calculateMonthlyRevenue);
router.post('/revenue/process-all', financeController.processAllRegionsRevenue);

// --- Finance: Invoices & Settlements ---
router.get('/invoices', financeController.getInvoices);
router.get('/settlements', financeController.getSettlements);
router.get('/settlements/:id', financeController.getSettlementById);
router.put('/settlements/:id', financeController.updateSettlement);

// --- Compliance ---
import { ComplianceController } from './compliance.controller';
const complianceController = new ComplianceController();
router.get('/compliance/alerts', complianceController.getAlerts);
router.get('/compliance/summary', complianceController.getSummary);
router.get('/finance/invoices', financeController.getInvoices);
router.post('/finance/settlements/calculate', financeController.calculateSettlement);

router.get('/finance/settlements', financeController.getSettlements);
router.get('/finance/settlements/stats', financeController.getSettlementStats);
router.get('/finance/settlements/:id', financeController.getSettlementById);
router.post('/finance/settlements/generate-all', financeController.generateAllSettlements);
router.post('/finance/settlements/licensee/:licenseeId/generate', financeController.generateSettlement);
router.post('/finance/settlements/:id/pay', financeController.markSettlementPaid);

// --- Admin Ops: Refunds & Conversions ---
router.get('/refund-requests', opsController.getRefundRequests);
router.put('/refund-requests/:id/approve', opsController.approveRefund);
router.get('/conversion-requests', opsController.getConversionRequests);
router.put('/conversion-requests/:id/approve', opsController.approveConversion);
router.put('/conversion-requests/:id/decline', opsController.declineConversion);

// --- Audit Logs ---
router.get('/audit-logs/stats', auditLogController.getStats);
router.get('/audit-logs/:entityType/:entityId', auditLogController.getByEntity);
router.get('/audit-logs', auditLogController.getAll);

// --- System ---
router.get('/system-settings', systemController.getSettings);
router.post('/system-settings', systemController.updateSettings);

export default router;
