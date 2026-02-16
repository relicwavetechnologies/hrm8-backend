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
                // Extended fields for compatibility with pricing auth
                user_id?: string;
                status?: string;
                region_id?: string | null;
            };
            user?: {
                id: string;
                email?: string;
                companyId?: string;
                role?: string;
                type?: string;
                firstName?: string;
                lastName?: string;
                [key: string]: any;
            };
            assignedRegionIds?: string[];
        }
    }
}

export { };
