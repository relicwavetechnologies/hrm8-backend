"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("./admin.service");
class AdminController {
    constructor() {
        // ==================== CATEGORIES ====================
        this.getAllCategories = async (req, res) => {
            try {
                const includeInactive = req.query.includeInactive === 'true';
                const categories = await this.service.getAllCategories(includeInactive);
                res.json({ success: true, data: categories });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        };
        this.getCategoryById = async (req, res) => {
            try {
                const id = this.getParam(req.params.id);
                const category = await this.service.getCategoryById(id);
                res.json({ success: true, data: category });
            }
            catch (error) {
                res.status(404).json({ success: false, error: error.message });
            }
        };
        this.createCategory = async (req, res) => {
            try {
                const category = await this.service.createCategory(req.body);
                res.status(201).json({ success: true, data: category });
            }
            catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        };
        this.updateCategory = async (req, res) => {
            try {
                const id = this.getParam(req.params.id);
                const category = await this.service.updateCategory(id, req.body);
                res.json({ success: true, data: category });
            }
            catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        };
        this.deleteCategory = async (req, res) => {
            try {
                const id = this.getParam(req.params.id);
                await this.service.deleteCategory(id);
                res.json({ success: true, message: 'Category deleted successfully' });
            }
            catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        };
        this.reorderCategories = async (req, res) => {
            try {
                const { order } = req.body; // Array of { id, order }
                await this.service.reorderCategories(order);
                res.json({ success: true, message: 'Categories reordered successfully' });
            }
            catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        };
        // ==================== TAGS ====================
        this.getAllTags = async (req, res) => {
            try {
                const includeInactive = req.query.includeInactive === 'true';
                const tags = await this.service.getAllTags(includeInactive);
                res.json({ success: true, data: tags });
            }
            catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        };
        this.getTagById = async (req, res) => {
            try {
                const id = this.getParam(req.params.id);
                const tag = await this.service.getTagById(id);
                res.json({ success: true, data: tag });
            }
            catch (error) {
                res.status(404).json({ success: false, error: error.message });
            }
        };
        this.createTag = async (req, res) => {
            try {
                const tag = await this.service.createTag(req.body);
                res.status(201).json({ success: true, data: tag });
            }
            catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        };
        this.updateTag = async (req, res) => {
            try {
                const id = this.getParam(req.params.id);
                const tag = await this.service.updateTag(id, req.body);
                res.json({ success: true, data: tag });
            }
            catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        };
        this.deleteTag = async (req, res) => {
            try {
                const id = this.getParam(req.params.id);
                await this.service.deleteTag(id);
                res.json({ success: true, message: 'Tag deleted successfully' });
            }
            catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        };
        this.service = new admin_service_1.AdminService();
    }
    getParam(value) {
        if (Array.isArray(value))
            return value[0];
        return value || '';
    }
}
exports.AdminController = AdminController;
