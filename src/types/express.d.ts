// Type definitions for Express Request extensions

declare global {
    namespace Express {
        interface Request {
            hrm8User?: {
                id: string;
                email?: string;
                firstName?: string;
                lastName?: string;
                role: string;
                licenseeId?: string;
                user_id?: string;
                status?: string;
                region_id?: string | null;
            };
            assignedRegionIds?: string[];
        }
    }
}

export { };
