import { AdminRepository } from './admin.repository';

export interface CreateCategoryDTO {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    color?: string;
    order?: number;
}

export interface UpdateCategoryDTO extends Partial<CreateCategoryDTO> {
    is_active?: boolean;
}

export interface CreateTagDTO {
    name: string;
    slug?: string;
    color?: string;
    description?: string;
}

export interface UpdateTagDTO extends Partial<CreateTagDTO> {
    is_active?: boolean;
}

export class AdminService {
    private repository: AdminRepository;

    constructor() {
        this.repository = new AdminRepository();
    }

    // ==================== CATEGORIES ====================

    async getAllCategories(includeInactive = false) {
        return this.repository.getAllCategories(includeInactive);
    }

    async getCategoryById(id: string) {
        const category = await this.repository.getCategoryById(id);
        if (!category) {
            throw new Error('Category not found');
        }
        return category;
    }

    async createCategory(data: CreateCategoryDTO) {
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

    async updateCategory(id: string, data: UpdateCategoryDTO) {
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

    async deleteCategory(id: string) {
        const category = await this.getCategoryById(id);

        if ((category as any)._count?.jobs > 0) {
            throw new Error(
                `Cannot delete category with ${(category as any)._count.jobs} associated jobs. Please reassign or delete the jobs first.`
            );
        }

        return this.repository.deleteCategory(id);
    }

    async reorderCategories(newOrder: { id: string; order: number }[]) {
        return this.repository.reorderCategories(newOrder);
    }

    // ==================== TAGS ====================

    async getAllTags(includeInactive = false) {
        return this.repository.getAllTags(includeInactive);
    }

    async getTagById(id: string) {
        const tag = await this.repository.getTagById(id);
        if (!tag) {
            throw new Error('Tag not found');
        }
        return tag;
    }

    async createTag(data: CreateTagDTO) {
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

    async updateTag(id: string, data: UpdateTagDTO) {
        await this.getTagById(id);

        if (data.slug) {
            const existing = await this.repository.getTagBySlugExcluding(data.slug, id);
            if (existing) {
                throw new Error('Tag with this slug already exists');
            }
        }

        return this.repository.updateTag(id, data);
    }

    async deleteTag(id: string) {
        await this.getTagById(id);
        return this.repository.deleteTag(id);
    }

    // ==================== UTILS ====================

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
}
