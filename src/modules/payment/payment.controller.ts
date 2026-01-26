import { Request, Response } from 'express';
import { BaseController } from '../../core/controller';
import { prisma } from '../../utils/prisma';
import Stripe from 'stripe';

export class PaymentController extends BaseController {
    stripeWebhookHandler = async (req: Request, res: Response) => {
        const isMockEvent = req.headers['x-mock-stripe-event'] === 'true';
        const isUsingMock = process.env.USE_MOCK_STRIPE === 'true' || process.env.NODE_ENV === 'development';

        let event: Stripe.Event;

        if (isMockEvent && isUsingMock) {
            console.log('🧪 Processing mock Stripe webhook (dev mode)');
            if (Buffer.isBuffer(req.body)) {
                event = JSON.parse(req.body.toString());
            } else if (typeof req.body === 'string') {
                event = JSON.parse(req.body);
            } else {
                event = req.body as Stripe.Event;
            }
        } else {
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
            const signature = req.headers['stripe-signature'];

            if (!webhookSecret || !signature) {
                return res.status(400).send('Missing webhook configuration');
            }

            try {
                const StripeLib = (await import('stripe')).default;
                const localStripe = new StripeLib(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-01-27.acacia' } as any);
                event = localStripe.webhooks.constructEvent(req.body, signature as string, webhookSecret);
            } catch (err: any) {
                return res.status(400).send(`Webhook Error: ${err?.message}`);
            }
        }

        console.log(`🔔 Webhook received: ${event.type}`);

        try {
            if (event.type === 'checkout.session.completed') {
                const session = event.data.object as Stripe.Checkout.Session;
                const metadata = session.metadata || {};

                // Handle wallet recharge
                if (metadata.type === 'wallet_recharge') {
                    const { WalletService } = await import('../wallet/wallet.service');
                    const companyId = metadata.companyId;
                    const amount = (session.amount_total || 0) / 100;

                    if (companyId) {
                        const wallet = await WalletService.getOrCreateAccount('COMPANY', companyId);
                        await WalletService.creditAccount({
                            accountId: wallet.id,
                            amount,
                            type: 'TRANSFER_IN',
                            description: `Stripe Payment Session ${session.id}`,
                            referenceId: session.id,
                            referenceType: 'STRIPE_SESSION'
                        });
                        console.log(`✅ Wallet recharged for company ${companyId}: $${amount}`);
                    }
                }
            }
            return res.json({ received: true });
        } catch (error) {
            console.error('Error handling Stripe webhook', error);
            return res.status(500).send('Webhook handler error');
        }
    };
}
