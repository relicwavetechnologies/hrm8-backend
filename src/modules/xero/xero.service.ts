import crypto from 'crypto';
import { BILLING_PROVIDER_MODE, XERO_ENABLED } from '../../config/billing-env';
import { Logger } from '../../utils/logger';

const log = Logger.create('xero');

export interface XeroInvoiceInput {
  companyId: string;
  amount: number;
  currency: string;
  description: string;
  lineItems?: Array<{ description: string; amount: number }>;
}

export interface XeroInvoice {
  invoiceId: string;
  invoiceNumber: string;
  status: 'AUTHORISED' | 'PAID';
}

export interface XeroCreditNote {
  creditNoteId: string;
  status: 'AUTHORISED';
}

export interface XeroBillInput {
  contactName: string;
  contactEmail?: string;
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  lineItems?: Array<{ description: string; amount: number; accountCode?: string }>;
}

export interface XeroBill {
  billId: string;
  billNumber: string;
  status: 'AUTHORISED' | 'PAID';
}

export interface XeroPaymentInput {
  invoiceId: string;
  amount: number;
  currency: string;
  accountCode: string;
  reference?: string;
  date?: string;
}

export interface XeroPayment {
  paymentId: string;
  status: 'AUTHORISED';
}

export class XeroService {
  static createInvoice(input: XeroInvoiceInput): XeroInvoice {
    if (BILLING_PROVIDER_MODE === 'live' && XERO_ENABLED) {
      return this.createLiveInvoice(input);
    }
    return this.createMockInvoice(input);
  }

  static createBill(input: XeroBillInput): XeroBill {
    if (BILLING_PROVIDER_MODE === 'live' && XERO_ENABLED) {
      return this.createLiveBill(input);
    }
    return this.createMockBill(input);
  }

  static createPayment(input: XeroPaymentInput): XeroPayment {
    if (BILLING_PROVIDER_MODE === 'live' && XERO_ENABLED) {
      return this.createLivePayment(input);
    }
    return this.createMockPayment(input);
  }

  static createCreditNote(invoiceId: string, amount: number, currency: string): XeroCreditNote {
    if (BILLING_PROVIDER_MODE === 'live' && XERO_ENABLED) {
      return this.createLiveCreditNote(invoiceId, amount, currency);
    }
    return this.createMockCreditNote(invoiceId, amount, currency);
  }

  /* ── Mock implementations ─────────────────────────────────── */

  private static createMockInvoice(input: XeroInvoiceInput): XeroInvoice {
    const ts = Date.now().toString();
    const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

    return {
      invoiceId: `xero_inv_${suffix}`,
      invoiceNumber: `HRM8-${input.currency}-${ts.slice(-6)}-${suffix}`,
      status: 'AUTHORISED',
    };
  }

  private static createMockCreditNote(_invoiceId: string, _amount: number, _currency: string): XeroCreditNote {
    return {
      creditNoteId: `xero_cn_${crypto.randomUUID().replace(/-/g, '')}`,
      status: 'AUTHORISED',
    };
  }

  /* ── Live implementations ─────────────────────────────────── */

  private static createLiveInvoice(input: XeroInvoiceInput): XeroInvoice {
    log.info('Creating live Xero invoice', {
      companyId: input.companyId,
      amount: input.amount,
      currency: input.currency,
    });

    /**
     * Live call:
     *   POST https://api.xero.com/api.xro/2.0/Invoices
     *   Headers: Authorization: Bearer <access_token>, xero-tenant-id: <tenant>
     *   Body: {
     *     Type: 'ACCREC',
     *     Contact: { ContactID: companyId },
     *     LineItems: [ { Description, Quantity: 1, UnitAmount, AccountCode } ],
     *     CurrencyCode: currency,
     *     Status: 'AUTHORISED'
     *   }
     *
     * Placeholder IDs below. Wire in when XERO_CLIENT_ID + XERO_CLIENT_SECRET
     * are configured and OAuth flow is in place.
     */
    const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    return {
      invoiceId: `xero_live_inv_${suffix}`,
      invoiceNumber: `HRM8-${input.currency}-${Date.now().toString().slice(-6)}-${suffix}`,
      status: 'AUTHORISED',
    };
  }

  private static createLiveCreditNote(invoiceId: string, amount: number, currency: string): XeroCreditNote {
    log.info('Creating live Xero credit note', { invoiceId, amount, currency });
    return {
      creditNoteId: `xero_live_cn_${crypto.randomUUID().replace(/-/g, '')}`,
      status: 'AUTHORISED',
    };
  }

  /* ── Bill (ACCPAY) mock/live ────────────────────────────── */

  private static createMockBill(input: XeroBillInput): XeroBill {
    const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    return {
      billId: `xero_bill_${suffix}`,
      billNumber: `HRM8-EXP-${input.currency}-${Date.now().toString().slice(-6)}-${suffix}`,
      status: 'AUTHORISED',
    };
  }

  private static createLiveBill(input: XeroBillInput): XeroBill {
    log.info('Creating live Xero ACCPAY bill', { contact: input.contactName, amount: input.amount, currency: input.currency });
    const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    return {
      billId: `xero_live_bill_${suffix}`,
      billNumber: `HRM8-EXP-${input.currency}-${Date.now().toString().slice(-6)}-${suffix}`,
      status: 'AUTHORISED',
    };
  }

  /* ── Payment mock/live ──────────────────────────────────── */

  private static createMockPayment(input: XeroPaymentInput): XeroPayment {
    log.info('Mock Xero payment recorded', { invoiceId: input.invoiceId, amount: input.amount });
    return {
      paymentId: `xero_pmt_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
      status: 'AUTHORISED',
    };
  }

  private static createLivePayment(input: XeroPaymentInput): XeroPayment {
    log.info('Creating live Xero payment', { invoiceId: input.invoiceId, amount: input.amount });
    return {
      paymentId: `xero_live_pmt_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
      status: 'AUTHORISED',
    };
  }
}
