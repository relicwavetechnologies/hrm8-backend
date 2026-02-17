"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapacityController = void 0;
const prisma_1 = require("../../utils/prisma");
/**
 * Capacity Controller
 * Handles capacity monitoring for consultants
 */
class CapacityController {
    constructor() {
        /**
         * Get capacity warnings for consultants
         * GET /hrm8/consultants/capacity-warnings
         */
        this.getCapacityWarnings = async (_req, res) => {
            try {
                // Get all active consultants with their job counts
                const consultants = await prisma_1.prisma.consultant.findMany({
                    where: {
                        status: 'ACTIVE'
                    },
                    include: {
                        job_assignments: {
                            where: {
                                status: { in: ['ACTIVE', 'PENDING'] }
                            }
                        }
                    }
                });
                const MAX_CAPACITY = 10; // Default max jobs per consultant
                const WARNING_THRESHOLD = 0.8; // 80% of capacity
                const warnings = consultants
                    .map(consultant => {
                    const jobCount = consultant.job_assignments?.length || 0;
                    const capacity = MAX_CAPACITY;
                    const utilizationRate = jobCount / capacity;
                    return {
                        consultantId: consultant.id,
                        name: `${consultant.first_name} ${consultant.last_name}`,
                        email: consultant.email,
                        currentJobs: jobCount,
                        maxCapacity: capacity,
                        utilizationRate,
                        status: utilizationRate >= 1 ? 'OVERLOADED' :
                            utilizationRate >= WARNING_THRESHOLD ? 'WARNING' :
                                'NORMAL'
                    };
                })
                    .filter(c => c.status !== 'NORMAL')
                    .sort((a, b) => b.utilizationRate - a.utilizationRate);
                res.json({
                    success: true,
                    data: {
                        warnings,
                        summary: {
                            total: consultants.length,
                            overloaded: warnings.filter(w => w.status === 'OVERLOADED').length,
                            warning: warnings.filter(w => w.status === 'WARNING').length
                        }
                    }
                });
            }
            catch (error) {
                console.error('Get capacity warnings error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch capacity warnings'
                });
            }
        };
    }
}
exports.CapacityController = CapacityController;
