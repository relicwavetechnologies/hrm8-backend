export const UPGRADE_PRICE_MAP = {
    shortlisting: { amount: 1990, currency: 'usd', label: 'Shortlisting' },
    full_service: { amount: 5990, currency: 'usd', label: 'Full Service' },
    executive_search: { amount: 9990, currency: 'usd', label: 'Executive Search' },
} as const;

export type UpgradeTier = keyof typeof UPGRADE_PRICE_MAP;

export const COMMISSION_RATES = {
    SHORTLISTING: 0.15, // 15% of shortlisting service fee ($1,990)
    FULL_SERVICE: 0.20, // 20% of full-service fee ($5,990)
    EXECUTIVE_SEARCH: 0.25, // 25% of executive search fee
    SUBSCRIPTION: 0.20, // 20% of subscription revenue
} as const;

export const SERVICE_FEES = {
    SHORTLISTING: 1990,
    FULL_SERVICE: 5990,
    EXECUTIVE_SEARCH_UNDER_100K: 9990,
    EXECUTIVE_SEARCH_OVER_100K: 14990,
} as const;
