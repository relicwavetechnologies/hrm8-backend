import crypto from 'crypto';

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
    const ts = Date.now().toString();
    const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

    return {
      invoiceId: `xero_inv_${suffix}`,
      invoiceNumber: `HRM8-${input.currency}-${ts.slice(-6)}-${suffix}`,
      status: 'AUTHORISED',
    };
  }

  static createCreditNote(_invoiceId: string, _amount: number, _currency: string): XeroCreditNote {
    return {
      creditNoteId: `xero_cn_${crypto.randomUUID().replace(/-/g, '')}`,
      status: 'AUTHORISED',
    };
  }
}
