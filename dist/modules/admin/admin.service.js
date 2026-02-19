"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const admin_repository_1 = require("./admin.repository");
class AdminService {
    constructor() {
        this.repository = new admin_repository_1.AdminRepository();
    }
    // ==================== CATEGORIES ====================
    async getAllCategories(includeInactive = false) {
        return this.repository.getAllCategories(includeInactive);
    }
    async getCategoryById(id) {
        const category = await this.repository.getCategoryById(id);
        if (!category) {
            throw new Error('Category not found');
        }
        return category;
    }
    async createCategory(data) {
        const slug = data.slug || this.generateSlug(data.name);
        // Check slug uniqueness
        const existing = await this.repository.getCategoryBySlug(slug);
        if (existing) {
            throw new Error('Category with this slug already exists');
        }
        return this.repository.createCategory({
            ...data,
            slug
        });
    }
    async updateCategory(id, data) {
        // Verify category exists
        await this.getCategoryById(id);
        // If slug is being updated, check uniqueness
        if (data.slug) {
            const existing = await this.repository.getCategoryBySlugExcluding(data.slug, id);
            if (existing) {
                throw new Error('Category with this slug already exists');
            }
        }
        return this.repository.updateCategory(id, data);
    }
    async deleteCategory(id) {
        const category = await this.getCategoryById(id);
        if (category._count?.jobs > 0) {
            throw new Error(`Cannot delete category with ${category._count.jobs} associated jobs. Please reassign or delete the jobs first.`);
        }
        return this.repository.deleteCategory(id);
    }
    async reorderCategories(newOrder) {
        return this.repository.reorderCategories(newOrder);
    }
    // ==================== TAGS ====================
    async getAllTags(includeInactive = false) {
        return this.repository.getAllTags(includeInactive);
    }
    async getTagById(id) {
        const tag = await this.repository.getTagById(id);
        if (!tag) {
            throw new Error('Tag not found');
        }
        return tag;
    }
    async createTag(data) {
        const slug = data.slug || this.generateSlug(data.name);
        const existing = await this.repository.getTagBySlug(slug);
        if (existing) {
            throw new Error('Tag with this slug already exists');
        }
        return this.repository.createTag({
            ...data,
            slug
        });
    }
    async updateTag(id, data) {
        await this.getTagById(id);
        if (data.slug) {
            const existing = await this.repository.getTagBySlugExcluding(data.slug, id);
            if (existing) {
                throw new Error('Tag with this slug already exists');
            }
        }
        return this.repository.updateTag(id, data);
    }
    async deleteTag(id) {
        await this.getTagById(id);
        return this.repository.deleteTag(id);
    }
    // ==================== UTILS ====================
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
}
exports.AdminService = AdminService;
