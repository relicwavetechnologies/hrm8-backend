import { Request, Response } from 'express';
import { prisma } from '../../utils/prisma';
import { Hrm8AuthenticatedRequest } from '../../types';

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

            const {
                status,
                companyId,
                agingDays,
                regionId,
                company_id,
                aging_days,
                region_id,
            } = req.query as Record<string, string | undefined>;

            if (status) {
                filters.status = status;
            }
            if (companyId || company_id) {
                filters.company_id = (companyId || company_id) as string;
            }
            if (agingDays || aging_days) {
                const days = parseInt((agingDays || aging_days) as string);
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);
                filters.created_at = { lte: cutoffDate };
            }
            if (regionId || region_id) {
                filters.region_id = regionId || region_id;
            }

            // Apply regional isolation for licensees
            if (req.assignedRegionIds && req.assignedRegionIds.length > 0) {
                if (filters.region_id && !req.assignedRegionIds.includes(filters.region_id)) {
                    res.json({ success: true, data: { invoices: [] } });
                    return;
                }
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

            const { regionId, region_id } = req.query as Record<string, string | undefined>;
            if (regionId || region_id) {
                where.region_id = regionId || region_id;
            }

            // Apply regional isolation for licensees
            if (req.assignedRegionIds && req.assignedRegionIds.length > 0) {
                if (where.region_id && !req.assignedRegionIds.includes(where.region_id)) {
                    res.json({ success: true, data: { candidates: [] } });
                    return;
                }
                where.company = {
                    region_id: { in: req.assignedRegionIds }
                };
            }

            const candidatesRaw = await prisma.bill.findMany({
                where,
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            region_id: true,
                            users: {
                                select: { email: true },
                                orderBy: { created_at: 'asc' },
                                take: 1,
                            },
                        }
                    }
                },
                orderBy: { due_date: 'asc' }
            });

            const candidates = candidatesRaw.map((c) => ({
                ...c,
                company: c.company
                    ? {
                        id: c.company.id,
                        name: c.company.name,
                        region_id: c.company.region_id,
                        email: c.company.users?.[0]?.email ?? null,
                    }
                    : null,
            }));

            res.json({ success: true, data: { candidates } });
        } catch (error) {
            console.error('Get dunning error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch dunning candidates' });
        }
    };

    /**
     * Download invoice (simple HTML render)
     * GET /hrm8/finance/invoices/:id/download
     */
    downloadInvoice = async (req: Hrm8AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const id = String((req.params as any).id);

            const invoice = await prisma.bill.findUnique({
                where: { id },
                include: {
                    company: { select: { id: true, name: true, region_id: true } }
                }
            });

            if (!invoice) {
                res.status(404).json({ success: false, error: 'Invoice not found' });
                return;
            }

            if (req.assignedRegionIds && req.assignedRegionIds.length > 0) {
                if (!invoice.company?.region_id || !req.assignedRegionIds.includes(invoice.company.region_id)) {
                    res.status(403).json({ success: false, error: 'Access denied' });
                    return;
                }
            }

            const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];
            const lineItemsHtml = lineItems
                .map((item: any) => `
                    <tr>
                        <td>${item.name || item.description || 'Item'}</td>
                        <td>${item.quantity || 1}</td>
                        <td>${invoice.currency} ${Number(item.amount || item.unit_price || 0).toFixed(2)}</td>
                    </tr>
                `)
                .join('');

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8" />
                    <title>Invoice ${invoice.bill_number}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
                        h1 { margin-bottom: 4px; }
                        .meta { margin-bottom: 16px; color: #6b7280; }
                        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; }
                        .totals { margin-top: 16px; text-align: right; }
                    </style>
                </head>
                <body>
                    <h1>Invoice ${invoice.bill_number}</h1>
                    <div class="meta">Company: ${invoice.company?.name || 'Unknown'} • Status: ${invoice.status}</div>
                    <div class="meta">Due: ${invoice.due_date.toDateString()} • Amount: ${invoice.currency} ${Number(invoice.total_amount).toFixed(2)}</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lineItemsHtml || `<tr><td colspan="3">No line items</td></tr>`}
                        </tbody>
                    </table>
                    <div class="totals">
                        <div>Subtotal: ${invoice.currency} ${Number(invoice.amount).toFixed(2)}</div>
                        <div>Tax: ${invoice.currency} ${Number(invoice.tax_amount || 0).toFixed(2)}</div>
                        <div><strong>Total: ${invoice.currency} ${Number(invoice.total_amount).toFixed(2)}</strong></div>
                    </div>
                </body>
                </html>
            `;

            res.setHeader('Content-Type', 'text/html');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="invoice-${invoice.bill_number}.html"`
            );
            res.status(200).send(html);
        } catch (error) {
            console.error('Download invoice error:', error);
            res.status(500).json({ success: false, error: 'Failed to download invoice' });
        }
    };

    /**
     * Calculate settlement for a licensee
     * POST /hrm8/finance/settlements/calculate
     */
    calculateSettlement = async (req: Hrm8AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            let { licenseeId, periodStart, periodEnd, licensee_id, period_start, period_end } = req.body;
            licenseeId = licenseeId || licensee_id;
            periodStart = periodStart || period_start;
            periodEnd = periodEnd || period_end;

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
            const revenueSharePercent = Number(licensee.revenue_share_percent || 0);
            const commissionRate = revenueSharePercent > 0 ? revenueSharePercent / 100 : 0.3;
            const licenseeShare = totalRevenue * commissionRate;
            const platformShare = totalRevenue - licenseeShare;

            const settlement = {
                licensee_id: licenseeId,
                period_start: start,
                period_end: end,
                total_revenue: totalRevenue,
                commission_rate: commissionRate,
                licensee_share: licenseeShare,
                platform_share: platformShare,
                bill_count: paidBills.length
            };

            res.json({ success: true, data: { settlement } });
        } catch (error) {
            console.error('Calculate settlement error:', error);
            res.status(500).json({ success: false, error: 'Failed to calculate settlement' });
        }
    };
}
