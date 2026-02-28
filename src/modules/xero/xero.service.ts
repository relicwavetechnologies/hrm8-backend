import crypto from 'crypto';
import { BILLING_PROVIDER_MODE } from '../../config/billing-env';
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

export class XeroService {
  static createInvoice(input: XeroInvoiceInput): XeroInvoice {
    if (BILLING_PROVIDER_MODE === 'live') {
      return this.createLiveInvoice(input);
    }
    return this.createMockInvoice(input);
  }

  static createCreditNote(invoiceId: string, amount: number, currency: string): XeroCreditNote {
    if (BILLING_PROVIDER_MODE === 'live') {
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

    /**
     * Live call:
     *   POST https://api.xero.com/api.xro/2.0/CreditNotes
     *   Body: {
     *     Type: 'ACCRECCREDIT',
     *     Contact: { ... from original invoice },
     *     LineItems: [ { Description: 'Refund', UnitAmount: amount } ],
     *     CurrencyCode: currency,
     *     Status: 'AUTHORISED'
     *   }
     *   Then allocate credit note to invoice via POST /CreditNotes/{id}/Allocations
     */
    return {
      creditNoteId: `xero_live_cn_${crypto.randomUUID().replace(/-/g, '')}`,
      status: 'AUTHORISED',
    };
  }
}
