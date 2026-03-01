"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirwallexFxService = void 0;
const billing_env_1 = require("../../config/billing-env");
const logger_1 = require("../../utils/logger");
const log = logger_1.Logger.create('airwallex-fx');
const MOCK_RATES = {
    USD: { GBP: 0.79, EUR: 0.92, AUD: 1.53, INR: 83.12, NZD: 1.64, SGD: 1.34, CAD: 1.36 },
    GBP: { USD: 1.27, EUR: 1.17, AUD: 1.94, INR: 105.36, NZD: 2.08, SGD: 1.70, CAD: 1.72 },
    EUR: { USD: 1.09, GBP: 0.86, AUD: 1.66, INR: 90.20, NZD: 1.78, SGD: 1.46, CAD: 1.48 },
    AUD: { USD: 0.65, GBP: 0.52, EUR: 0.60, INR: 54.30, NZD: 1.07, SGD: 0.88, CAD: 0.89 },
    INR: { USD: 0.012, GBP: 0.0095, EUR: 0.011, AUD: 0.018, NZD: 0.020, SGD: 0.016, CAD: 0.016 },
};
function getMockRate(sell, buy) {
    if (sell === buy)
        return 1.0;
    const direct = MOCK_RATES[sell]?.[buy];
    if (direct)
        return direct;
    const inverse = MOCK_RATES[buy]?.[sell];
    if (inverse)
        return Number((1 / inverse).toFixed(6));
    const sellToUsd = MOCK_RATES[sell]?.['USD'] ?? (sell === 'USD' ? 1 : undefined);
    const usdToBuy = MOCK_RATES['USD']?.[buy] ?? (buy === 'USD' ? 1 : undefined);
    if (sellToUsd !== undefined && usdToBuy !== undefined) {
        return Number((sellToUsd * usdToBuy).toFixed(6));
    }
    log.warn('No FX rate path found, defaulting to 1.0', { sell, buy });
    return 1.0;
}
class AirwallexFxService {
    static async getQuote(sellCurrency, buyCurrency) {
        const sell = sellCurrency.toUpperCase();
        const buy = buyCurrency.toUpperCase();
        if (sell === buy) {
            return {
                sellCurrency: sell,
                buyCurrency: buy,
                rate: 1.0,
                inverseRate: 1.0,
                quoteId: `fx_same_${sell}`,
                validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                source: 'SAME_CURRENCY',
            };
        }
        if (billing_env_1.BILLING_PROVIDER_MODE === 'live') {
            return this.getLiveQuote(sell, buy);
        }
        return this.getMockQuote(sell, buy);
    }
    static resolveFxFields(sourceCurrency, payoutCurrency, sourceAmount, quote) {
        const fxRate = quote.rate;
        const payoutAmount = Number((sourceAmount * fxRate).toFixed(2));
        return { payoutAmount, fxRate, fxSource: quote.source };
    }
    static getMockQuote(sell, buy) {
        const rate = getMockRate(sell, buy);
        log.info('Mock FX quote', { sell, buy, rate });
        return {
            sellCurrency: sell,
            buyCurrency: buy,
            rate,
            inverseRate: Number((1 / rate).toFixed(6)),
            quoteId: `fx_mock_${sell}_${buy}_${Date.now()}`,
            validUntil: new Date(Date.now() + 30 * 1000),
            source: 'MOCK',
        };
    }
    static async getLiveQuote(sell, buy) {
        log.info('Fetching live FX quote from Airwallex', { sell, buy });
        try {
            const baseUrl = process.env.AIRWALLEX_API_BASE_URL;
            const apiKey = process.env.AIRWALLEX_API_KEY;
            const clientId = process.env.AIRWALLEX_CLIENT_ID;
            if (!baseUrl || !apiKey || !clientId) {
                log.warn('Airwallex credentials missing, falling back to mock rates');
                return this.getMockQuote(sell, buy);
            }
            const authRes = await fetch(`${baseUrl}/api/v1/authentication/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': clientId,
                    'x-api-key': apiKey,
                },
            });
            if (!authRes.ok)
                throw new Error(`Airwallex auth failed: ${authRes.status}`);
            const { token } = await authRes.json();
            const quoteRes = await fetch(`${baseUrl}/api/v1/fx/rates?sell_currency=${sell}&buy_currency=${buy}&amount=1&amount_currency=${sell}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!quoteRes.ok) {
                log.warn('Airwallex FX quote failed, falling back to mock', { status: quoteRes.status });
                return this.getMockQuote(sell, buy);
            }
            const data = await quoteRes.json();
            const rate = data.client_rate ?? data.rate ?? data.fx_rate;
            if (!rate || typeof rate !== 'number') {
                log.warn('Unexpected Airwallex FX response, falling back to mock', { data });
                return this.getMockQuote(sell, buy);
            }
            return {
                sellCurrency: sell,
                buyCurrency: buy,
                rate,
                inverseRate: Number((1 / rate).toFixed(6)),
                quoteId: data.quote_id ?? `fx_live_${sell}_${buy}_${Date.now()}`,
                validUntil: data.valid_to ? new Date(data.valid_to) : new Date(Date.now() + 30 * 1000),
                source: 'AIRWALLEX',
            };
        }
        catch (error) {
            log.error('Live FX quote failed, using mock fallback', { error, sell, buy });
            return this.getMockQuote(sell, buy);
        }
    }
}
exports.AirwallexFxService = AirwallexFxService;
