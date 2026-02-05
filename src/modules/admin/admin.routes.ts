import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const adminController = new AdminController();

// All admin routes require authentication
router.use(authenticate);

// Categories CRUD
router.get('/categories', adminController.getAllCategories);
router.get('/categories/:id', adminController.getCategoryById);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);
router.patch('/categories/reorder', adminController.reorderCategories);

// Tags CRUD
router.get('/tags', adminController.getAllTags);
router.get('/tags/:id', adminController.getTagById);
router.post('/tags', adminController.createTag);
router.put('/tags/:id', adminController.updateTag);
router.delete('/tags/:id', adminController.deleteTag);

export default router;
