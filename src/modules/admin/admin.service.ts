import { BaseService } from '../../core/service';
import { HttpException } from '../../core/http-exception';

export class AdminService extends BaseService {
  // ========== CATEGORIES ==========
  // NOTE: Category model needs to be added to Prisma schema
  // For now, using stub implementations

  async getCategories() {
    // Stub: Return empty array until Category model is added to schema
    return [];
  }

  async createCategory(data: { name: string; description?: string; is_active?: boolean }) {
    // Stub: Return mock category
    return {
      id: 'cat_' + Date.now(),
      name: data.name,
      description: data.description,
      is_active: data.is_active ?? true,
      created_at: new Date(),
    };
  }

  async updateCategory(id: string, data: { name?: string; description?: string; is_active?: boolean }) {
    // Stub: Return updated category
    return {
      id,
      ...data,
      updated_at: new Date(),
    };
  }

  async deleteCategory(id: string) {
    // Stub: Return success
    return { message: 'Category deleted successfully' };
  }

  // ========== TAGS ==========
  // NOTE: Tag model needs to be added to Prisma schema
  // For now, using stub implementations

  async getTags() {
    // Stub: Return empty array until Tag model is added to schema
    return [];
  }

  async createTag(data: { name: string; type?: string; color?: string }) {
    // Stub: Return mock tag
    return {
      id: 'tag_' + Date.now(),
      name: data.name,
      type: data.type || 'GENERAL',
      color: data.color,
      created_at: new Date(),
    };
  }

  async updateTag(id: string, data: { name?: string; type?: string; color?: string }) {
    // Stub: Return updated tag
    return {
      id,
      ...data,
      updated_at: new Date(),
    };
  }

  async deleteTag(id: string) {
    // Stub: Return success
    return { message: 'Tag deleted successfully' };
  }

  // ========== BILLING/WITHDRAWAL STUBS (for future implementation) ==========

  async getBillingInvoices(filters?: any) {
    // Stub: Return empty array for now
    return {
      invoices: [],
      total: 0,
    };
  }

  async createBillingInvoice(data: any) {
    // Stub: Return mock invoice
    return {
      id: 'inv_' + Date.now(),
      status: 'pending',
      created_at: new Date(),
    };
  }

  async getWithdrawals(filters?: any) {
    // Stub: Return empty array
    return {
      withdrawals: [],
      total: 0,
    };
  }

  async processWithdrawal(id: string, data: any) {
    // Stub: Return mock response
    return {
      id,
      status: 'processed',
      processed_at: new Date(),
    };
  }

  async getPaymentStats() {
    // Stub: Return mock stats
    return {
      totalRevenue: 0,
      pendingWithdrawals: 0,
      processedPayments: 0,
    };
  }

  async getBillingSettings() {
    // Stub: Return default settings
    return {
      currency: 'USD',
      taxRate: 0,
      paymentMethods: [],
    };
  }

  async updateBillingSettings(data: any) {
    // Stub: Return updated settings
    return {
      ...data,
      updated_at: new Date(),
    };
  }
}

export const adminService = new AdminService();
