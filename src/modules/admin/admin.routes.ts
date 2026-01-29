import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const adminController = new AdminController();

// All admin routes require authentication
router.use(authenticate);

// Categories CRUD
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Tags CRUD
router.get('/tags', adminController.getTags);
router.post('/tags', adminController.createTag);
router.put('/tags/:id', adminController.updateTag);
router.delete('/tags/:id', adminController.deleteTag);

// Billing & Withdrawals (stubs for now)
router.get('/billing/invoices', adminController.getBillingInvoices);
router.post('/billing/invoices', adminController.createBillingInvoice);
router.get('/billing/settings', adminController.getBillingSettings);
router.put('/billing/settings', adminController.updateBillingSettings);

router.get('/withdrawals', adminController.getWithdrawals);
router.post('/withdrawals/:id/process', adminController.processWithdrawal);

router.get('/payment-stats', adminController.getPaymentStats);

export default router;
