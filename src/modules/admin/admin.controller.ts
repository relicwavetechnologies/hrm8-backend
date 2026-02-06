import { Request, Response } from 'express';
import { AdminService } from './admin.service';

export class AdminController {
    private service: AdminService;

    constructor() {
        this.service = new AdminService();
    }
    private getParam(value: string | string[] | undefined): string {
        if (Array.isArray(value)) return value[0];
        return value || '';
    }

    // ==================== CATEGORIES ====================

    getAllCategories = async (req: Request, res: Response): Promise<void> => {
        try {
            const includeInactive = req.query.includeInactive === 'true';
            const categories = await this.service.getAllCategories(includeInactive);
            res.json({ success: true, data: categories });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    getCategoryById = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = this.getParam(req.params.id);
            const category = await this.service.getCategoryById(id);
            res.json({ success: true, data: category });
        } catch (error: any) {
            res.status(404).json({ success: false, error: error.message });
        }
    };

    createCategory = async (req: Request, res: Response): Promise<void> => {
        try {
            const category = await this.service.createCategory(req.body);
            res.status(201).json({ success: true, data: category });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    updateCategory = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = this.getParam(req.params.id);
            const category = await this.service.updateCategory(id, req.body);
            res.json({ success: true, data: category });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    deleteCategory = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = this.getParam(req.params.id);
            await this.service.deleteCategory(id);
            res.json({ success: true, message: 'Category deleted successfully' });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    reorderCategories = async (req: Request, res: Response): Promise<void> => {
        try {
            const { order } = req.body; // Array of { id, order }
            await this.service.reorderCategories(order);
            res.json({ success: true, message: 'Categories reordered successfully' });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    // ==================== TAGS ====================

    getAllTags = async (req: Request, res: Response): Promise<void> => {
        try {
            const includeInactive = req.query.includeInactive === 'true';
            const tags = await this.service.getAllTags(includeInactive);
            res.json({ success: true, data: tags });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    getTagById = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = this.getParam(req.params.id);
            const tag = await this.service.getTagById(id);
            res.json({ success: true, data: tag });
        } catch (error: any) {
            res.status(404).json({ success: false, error: error.message });
        }
    };

    createTag = async (req: Request, res: Response): Promise<void> => {
        try {
            const tag = await this.service.createTag(req.body);
            res.status(201).json({ success: true, data: tag });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    updateTag = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = this.getParam(req.params.id);
            const tag = await this.service.updateTag(id, req.body);
            res.json({ success: true, data: tag });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    deleteTag = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = this.getParam(req.params.id);
            await this.service.deleteTag(id);
            res.json({ success: true, message: 'Tag deleted successfully' });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    };
}
