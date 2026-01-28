import { CommissionStatus, CommissionType } from '@prisma/client';

export interface CommissionData {
    id: string;
    consultantId: string;
    regionId: string;
    jobId?: string | null;
    subscriptionId?: string | null;
    type: CommissionType;
    amount: number;
    rate?: number | null;
    description?: string | null;
    status: CommissionStatus;
    confirmedAt?: Date | null;
    paidAt?: Date | null;
    commissionExpiryDate?: Date | null;
    paymentReference?: string | null;
    notes?: string | null;
    createdAt: Date;
    updatedAt: Date;
    companyName?: string;
}
