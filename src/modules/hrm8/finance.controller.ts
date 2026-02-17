import { Request, Response } from 'express';
import { prisma } from '../../utils/prisma';
import { Hrm8AuthenticatedRequest } from '../../types';
import { FinanceOverviewService } from './finance-overview.service';

/**
 * Finance Controller
 * Handles invoices, dunning, and settlement calculations for HRM8
 */
export class FinanceController {
    /**
     * Get invoices with filters
     * GET /hrm8/finance/invoices
     */
    getInvoices = async (req: Hrm8AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const filters: any = {};

            if (req.query.status) {
                filters.status = req.query.status as string;
            }
            if (req.query.companyId) {
                filters.company_id = req.query.companyId as string;
            }
            if (req.query.agingDays) {
                const days = parseInt(req.query.agingDays as string);
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);
                filters.created_at = { lte: cutoffDate };
            }

            // Apply regional isolation for licensees
            if (req.assignedRegionIds && req.assignedRegionIds.length > 0) {
                filters.company = {
                    region_id: { in: req.assignedRegionIds }
                };
            }

            const invoices = await prisma.bill.findMany({
                where: filters,
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            region_id: true
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                take: 100
            });

            res.json({ success: true, data: { invoices } });
        } catch (error) {
            console.error('Get invoices error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
        }
    };

    /**
     * Get dunning candidates (overdue invoices)
     * GET /hrm8/finance/dunning
     */
    getDunning = async (req: Hrm8AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const where: any = {
                status: { in: ['PENDING', 'OVERDUE'] },
                due_date: { lt: new Date() }
            };

            // Apply regional isolation for licensees
            if (req.assignedRegionIds && req.assignedRegionIds.length > 0) {
                where.company = {
                    region_id: { in: req.assignedRegionIds }
                };
            }

            const candidates = await prisma.bill.findMany({
                where,
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: { due_date: 'asc' }
            });

            res.json({ success: true, data: { candidates } });
        } catch (error) {
            console.error('Get dunning error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch dunning candidates' });
        }
    };

    /**
     * Calculate settlement for a licensee
     * POST /hrm8/finance/settlements/calculate
     */
    calculateSettlement = async (req: Hrm8AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            let { licenseeId, periodStart, periodEnd, commit } = req.body;

            // If user is REGIONAL_LICENSEE, force their own licenseeId
            if (req.hrm8User?.role === 'REGIONAL_LICENSEE' && req.hrm8User.licenseeId) {
                licenseeId = req.hrm8User.licenseeId;
            }

            if (!licenseeId || !periodStart || !periodEnd) {
                res.status(400).json({
                    success: false,
                    error: 'licenseeId, periodStart, and periodEnd are required'
                });
                return;
            }

            const start = new Date(periodStart);
            const end = new Date(periodEnd);

            // Get all paid bills in the period for the licensee's regions
            const licensee = await prisma.regionalLicensee.findUnique({
                where: { id: licenseeId },
                include: {
                    regions: true
                }
            });

            if (!licensee) {
                res.status(404).json({ success: false, error: 'Licensee not found' });
                return;
            }

            const regionIds = licensee.regions.map(r => r.id);

            const paidBills = await prisma.bill.findMany({
                where: {
                    status: 'PAID',
                    paid_at: {
                        gte: start,
                        lte: end
                    },
                    company: {
                        region_id: { in: regionIds }
                    }
                }
            });

            const totalRevenue = paidBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
            const commissionRate = licensee.revenue_share_percent ? Number(licensee.revenue_share_percent) / 100 : 0.3;
            const licenseeShare = totalRevenue * commissionRate;
            const platformShare = totalRevenue - licenseeShare;

            const settlementData = {
                licensee_id: licenseeId,
                period_start: start,
                period_end: end,
                total_revenue: totalRevenue,
                licensee_share: licenseeShare,
                hrm8_share: platformShare,
                billCount: paidBills.length,
                status: 'PENDING'
            };

            if (commit) {
                const { SettlementService } = await import('./settlement.service');
                const { SettlementRepository } = await import('./settlement.repository');
                const settlementService = new SettlementService(new SettlementRepository());
                const savedSettlement = await settlementService.createSettlement(settlementData);

                res.json({ success: true, data: { settlement: savedSettlement, committed: true } });
                return;
            }

            res.json({
                success: true,
                data: {
                    settlement: {
                        ...settlementData,
                        commissionRate
                    },
                    committed: false
                }
            });
        } catch (error) {
            console.error('Calculate settlement error:', error);
            res.status(500).json({ success: false, error: 'Failed to calculate settlement' });
        }
    };

    /**
     * Get finance overview with aggregated metrics
     * GET /hrm8/finance/overview
     */
    getOverview = async (req: Hrm8AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const financeService = new FinanceOverviewService();

            // Apply regional filtering if user is a regional licensee
            const regionIds = req.assignedRegionIds && req.assignedRegionIds.length > 0
                ? req.assignedRegionIds
                : undefined;

            const overview = await financeService.getOverview(regionIds);

            res.json({ success: true, data: overview });
        } catch (error) {
            console.error('Get finance overview error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch finance overview' });
        }
    };
}
