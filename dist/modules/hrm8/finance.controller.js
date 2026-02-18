"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceController = void 0;
const prisma_1 = require("../../utils/prisma");
const finance_overview_service_1 = require("./finance-overview.service");
/**
 * Finance Controller
 * Handles invoices, dunning, and settlement calculations for HRM8
 */
class FinanceController {
    constructor() {
        /**
         * Get invoices with filters
         * GET /hrm8/finance/invoices
         */
        this.getInvoices = async (req, res) => {
            try {
                const filters = {};
                if (req.query.status) {
                    filters.status = req.query.status;
                }
                if (req.query.companyId) {
                    filters.company_id = req.query.companyId;
                }
                if (req.query.agingDays) {
                    const days = parseInt(req.query.agingDays);
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
                const invoices = await prisma_1.prisma.bill.findMany({
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
            }
            catch (error) {
                console.error('Get invoices error:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
            }
        };
        /**
         * Get dunning candidates (overdue invoices)
         * GET /hrm8/finance/dunning
         */
        this.getDunning = async (req, res) => {
            try {
                const where = {
                    status: { in: ['PENDING', 'OVERDUE'] },
                    due_date: { lt: new Date() }
                };
                // Apply regional isolation for licensees
                if (req.assignedRegionIds && req.assignedRegionIds.length > 0) {
                    where.company = {
                        region_id: { in: req.assignedRegionIds }
                    };
                }
                const candidates = await prisma_1.prisma.bill.findMany({
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
            }
            catch (error) {
                console.error('Get dunning error:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch dunning candidates' });
            }
        };
        /**
         * Calculate settlement for a licensee
         * POST /hrm8/finance/settlements/calculate
         */
        this.calculateSettlement = async (req, res) => {
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
                const licensee = await prisma_1.prisma.regionalLicensee.findUnique({
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
                const paidBills = await prisma_1.prisma.bill.findMany({
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
                    const { SettlementService } = await Promise.resolve().then(() => __importStar(require('./settlement.service')));
                    const { SettlementRepository } = await Promise.resolve().then(() => __importStar(require('./settlement.repository')));
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
            }
            catch (error) {
                console.error('Calculate settlement error:', error);
                res.status(500).json({ success: false, error: 'Failed to calculate settlement' });
            }
        };
        /**
         * Get finance overview with aggregated metrics
         * GET /hrm8/finance/overview
         */
        this.getOverview = async (req, res) => {
            try {
                const financeService = new finance_overview_service_1.FinanceOverviewService();
                // Apply regional filtering if user is a regional licensee
                const regionIds = req.assignedRegionIds && req.assignedRegionIds.length > 0
                    ? req.assignedRegionIds
                    : undefined;
                const overview = await financeService.getOverview(regionIds);
                res.json({ success: true, data: overview });
            }
            catch (error) {
                console.error('Get finance overview error:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch finance overview' });
            }
        };
    }
}
exports.FinanceController = FinanceController;
