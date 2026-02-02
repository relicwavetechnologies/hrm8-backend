import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticateHrm8, requireHrm8Role } from '../../middlewares/hrm8-auth.middleware';

const router = Router();
const adminController = new AdminController();

// All admin routes require HRM8 authentication
router.use(authenticateHrm8);

// ==================== CATEGORY ROUTES (GLOBAL_ADMIN only) ====================

router.get(
    '/categories',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.getAllCategories
);

router.get(
    '/categories/:id',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.getCategoryById
);

router.post(
    '/categories',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.createCategory
);

router.put(
    '/categories/:id',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.updateCategory
);

router.delete(
    '/categories/:id',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.deleteCategory
);

router.patch(
    '/categories/reorder',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.reorderCategories
);

// ==================== TAG ROUTES (GLOBAL_ADMIN only) ====================

router.get(
    '/tags',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.getAllTags
);

router.get(
    '/tags/:id',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.getTagById
);

router.post(
    '/tags',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.createTag
);

router.put(
    '/tags/:id',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.updateTag
);

router.delete(
    '/tags/:id',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.deleteTag
);

export default router;
