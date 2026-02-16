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
    adminController.getAllCategories as any as any
);

router.get(
    '/categories/:id',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.getCategoryById as any as any
);

router.post(
    '/categories',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.createCategory as any as any
);

router.put(
    '/categories/:id',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.updateCategory as any as any
);

router.delete(
    '/categories/:id',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.deleteCategory as any as any
);

router.patch(
    '/categories/reorder',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.reorderCategories as any as any
);

// ==================== TAG ROUTES (GLOBAL_ADMIN only) ====================

router.get(
    '/tags',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.getAllTags as any as any
);

router.get(
    '/tags/:id',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.getTagById as any as any
);

router.post(
    '/tags',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.createTag as any as any
);

router.put(
    '/tags/:id',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.updateTag as any as any
);

router.delete(
    '/tags/:id',
    requireHrm8Role(['GLOBAL_ADMIN']),
    adminController.deleteTag as any as any
);

export default router;
