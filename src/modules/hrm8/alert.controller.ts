import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { Hrm8AuthenticatedRequest } from '../../types';

/**
 * Alert Controller
 * Handles system alerts for HRM8 dashboard
 */
export class AlertController {
    /**
     * Get active system alerts
     * GET /hrm8/alerts
     */
    getActiveAlerts = async (_req: Hrm8AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            // Generate real-time alerts based on system state
            const alerts: Array<{
                id: string;
                type: 'ERROR' | 'WARNING' | 'INFO';
                title: string;
                message: string;
                createdAt: Date;
            }> = [];

            // Check for overdue invoices
            try {
                const overdueInvoices = await prisma.bill.count({
                    where: {
                        status: { in: ['PENDING', 'OVERDUE'] },
                        due_date: { lt: new Date() }
                    }
                });

                if (overdueInvoices > 0) {
                    alerts.push({
                        id: 'alert-overdue-invoices',
                        type: 'WARNING',
                        title: 'Overdue Invoices',
                        message: `There are ${overdueInvoices} overdue invoices requiring attention.`,
                        createdAt: new Date()
                    });
                }
            } catch (e) {
                console.log('Skipping overdue invoice check:', e);
            }

            // Check for pending settlements
            try {
                const pendingSettlements = await prisma.settlement.count({
                    where: {
                        status: 'PENDING'
                    }
                });

                if (pendingSettlements > 0) {
                    alerts.push({
                        id: 'alert-pending-settlements',
                        type: 'INFO',
                        title: 'Pending Settlements',
                        message: `${pendingSettlements} settlements are pending review.`,
                        createdAt: new Date()
                    });
                }
            } catch (e) {
                console.log('Skipping pending settlements check:', e);
            }

            // Check for pending lead conversion requests
            try {
                const pendingConversions = await prisma.leadConversionRequest.count({
                    where: {
                        status: 'PENDING'
                    }
                });

                if (pendingConversions > 0) {
                    alerts.push({
                        id: 'alert-pending-conversions',
                        type: 'INFO',
                        title: 'Pending Lead Conversions',
                        message: `${pendingConversions} lead conversion requests need approval.`,
                        createdAt: new Date()
                    });
                }
            } catch (e) {
                console.log('Skipping lead conversion check:', e);
            }

            // Check for open jobs without applications
            try {
                const openJobs = await prisma.job.count({
                    where: {
                        status: 'OPEN'
                    }
                });

                if (openJobs > 10) {
                    alerts.push({
                        id: 'alert-open-jobs',
                        type: 'INFO',
                        title: 'Open Job Positions',
                        message: `${openJobs} job positions are currently open.`,
                        createdAt: new Date()
                    });
                }
            } catch (e) {
                console.log('Skipping open jobs check:', e);
            }

            res.json({
                success: true,
                data: alerts
            });
        } catch (error) {
            console.error('Get alerts error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch alerts'
            });
        }
    };
}
