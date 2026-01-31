import { BaseService } from '../../core/service';
import { RevenueRepository } from './revenue.repository';
import { HttpException } from '../../core/http-exception';
import { RevenueStatus } from '@prisma/client';

export class RevenueService extends BaseService {
    constructor(private revenueRepository: RevenueRepository) {
        super();
    }

    async getAll(filters: any) {
        return this.revenueRepository.findMany(filters);
    }

    async getById(id: string) {
        const revenue = await this.revenueRepository.findById(id);
        if (!revenue) throw new HttpException(404, 'Revenue record not found');
        return revenue;
    }

    async confirm(id: string) {
        return this.revenueRepository.update(id, { status: 'CONFIRMED' });
    }

    async markAsPaid(id: string) {
        return this.revenueRepository.update(id, { status: 'PAID', paid_at: new Date() });
    }

    async getCompanyBreakdown(regionIds?: string[]) {
        return this.revenueRepository.getCompanyRevenueBreakdown(regionIds);
    }
}
