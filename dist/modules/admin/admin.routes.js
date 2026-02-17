"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("./admin.controller");
const hrm8_auth_middleware_1 = require("../../middlewares/hrm8-auth.middleware");
const router = (0, express_1.Router)();
const adminController = new admin_controller_1.AdminController();
// All admin routes require HRM8 authentication
router.use(hrm8_auth_middleware_1.authenticateHrm8);
// ==================== CATEGORY ROUTES (GLOBAL_ADMIN only) ====================
router.get('/categories', (0, hrm8_auth_middleware_1.requireHrm8Role)(['GLOBAL_ADMIN']), adminController.getAllCategories);
router.get('/categories/:id', (0, hrm8_auth_middleware_1.requireHrm8Role)(['GLOBAL_ADMIN']), adminController.getCategoryById);
router.post('/categories', (0, hrm8_auth_middleware_1.requireHrm8Role)(['GLOBAL_ADMIN']), adminController.createCategory);
router.put('/categories/:id', (0, hrm8_auth_middleware_1.requireHrm8Role)(['GLOBAL_ADMIN']), adminController.updateCategory);
router.delete('/categories/:id', (0, hrm8_auth_middleware_1.requireHrm8Role)(['GLOBAL_ADMIN']), adminController.deleteCategory);
router.patch('/categories/reorder', (0, hrm8_auth_middleware_1.requireHrm8Role)(['GLOBAL_ADMIN']), adminController.reorderCategories);
// ==================== TAG ROUTES (GLOBAL_ADMIN only) ====================
router.get('/tags', (0, hrm8_auth_middleware_1.requireHrm8Role)(['GLOBAL_ADMIN']), adminController.getAllTags);
router.get('/tags/:id', (0, hrm8_auth_middleware_1.requireHrm8Role)(['GLOBAL_ADMIN']), adminController.getTagById);
router.post('/tags', (0, hrm8_auth_middleware_1.requireHrm8Role)(['GLOBAL_ADMIN']), adminController.createTag);
router.put('/tags/:id', (0, hrm8_auth_middleware_1.requireHrm8Role)(['GLOBAL_ADMIN']), adminController.updateTag);
router.delete('/tags/:id', (0, hrm8_auth_middleware_1.requireHrm8Role)(['GLOBAL_ADMIN']), adminController.deleteTag);
exports.default = router;
