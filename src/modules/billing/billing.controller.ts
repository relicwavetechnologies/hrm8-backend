import { Request, Response } from 'express';
import { BaseController } from '../../core/controller';
import { BillingService } from './billing.service';
import { AuthenticatedRequest } from '../../types';

export class BillingController extends BaseController {
  constructor() {
    super('billing');
  }

  createCheckout = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);

      const result = await BillingService.createCheckout(
        {
          companyId: req.user.companyId,
          userId: req.user.id,
          userEmail: req.user.email,
        },
        req.body || {}
      );

      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  getPaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const paymentAttemptId = req.params.paymentAttemptId;
      const status = await BillingService.getPaymentStatus(paymentAttemptId);
      return this.sendSuccess(res, status);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  refundPayment = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return this.sendError(res, new Error('Unauthorized'), 401);
      const paymentAttemptId = req.params.paymentAttemptId;
      const result = await BillingService.refundPayment(paymentAttemptId, req.body?.reason);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  /** Serves HTML page that loads Airwallex SDK and redirects to hosted payment page. */
  airwallexRedirect = (req: Request, res: Response) => {
    const intentId = (req.query.intent_id as string) || '';
    const clientSecret = (req.query.client_secret as string) || '';
    const currency = (req.query.currency as string) || 'USD';
    const countryCode = (req.query.country_code as string) || 'US';
    const successUrl = (req.query.success_url as string) || '';
    const cancelUrl = (req.query.cancel_url as string) || '';

    if (!intentId || !clientSecret || !successUrl) {
      res.status(400).send('Missing required checkout parameters');
      return;
    }

    const env = process.env.AIRWALLEX_API_BASE_URL?.includes('demo') ? 'demo' : 'prod';
    const intentIdEnc = intentId.replace(/'/g, "\\'").replace(/</g, '\\u003c');
    const clientSecretEnc = clientSecret.replace(/'/g, "\\'").replace(/</g, '\\u003c');
    const successUrlEnc = successUrl.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/</g, '\\u003c');
    const cancelUrlEnc = cancelUrl.replace(/"/g, '&quot;').replace(/</g, '\\u003c');
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting to payment...</title></head>
<body>
  <p>Redirecting to secure payment...</p>
  <script type="module">
    (async function() {
      try {
        const { init } = await import('https://cdn.jsdelivr.net/npm/@airwallex/components-sdk@1/+esm');
        const { payments } = await init({ env: '${env}', enabledElements: ['payments'] });
        await payments.redirectToCheckout({
          intent_id: '${intentIdEnc}',
          client_secret: '${clientSecretEnc}',
          currency: '${currency}',
          country_code: '${countryCode}',
          successUrl: '${successUrlEnc}'
        });
      } catch (e) {
        document.body.innerHTML = '<p>Payment redirect failed. <a href="${cancelUrlEnc}">Return</a></p>';
        console.error(e);
      }
    })();
  </script>
</body>
</html>`;
    res.type('html').send(html);
  };

  handleAirwallexWebhook = async (req: Request, res: Response) => {
    try {
      const signature = (req.headers['x-signature'] as string) || (req.headers['x-airwallex-signature'] as string) || '';
      const timestamp = (req.headers['x-timestamp'] as string) || '';
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body ?? {});
      const rawStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
      const event = typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)
        ? req.body
        : JSON.parse(rawStr);
      const result = await BillingService.processWebhook(rawBody, signature, event, timestamp);
      return res.status(200).json({ received: true, ...result });
    } catch (error) {
      if ((error as any)?.statusCode === 401) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
      return this.sendError(res, error);
    }
  };
}
