/**
 * POST /api/stripe/webhook — Stripe Webhook Handler
 * Handles subscription lifecycle events:
 *   - checkout.session.completed → Activate plan + set credits
 *   - invoice.paid → Renew credits on auto-renewal
 *   - invoice.payment_failed → Warn user
 *   - customer.subscription.deleted → Downgrade to free
 *   - invoice.upcoming → Send renewal reminder email
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    let event;
    
    // If webhook secret is set, verify signature; otherwise accept (dev mode)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    const db = await getDb();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (!userId) break;

        const planKey = session.metadata.planKey || 'plus';
        const credits = parseInt(session.metadata.credits || '1000');

        await db.collection('users').updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              plan: planKey,
              credits: credits,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              subscriptionStatus: 'active',
              updatedAt: new Date(),
            },
          }
        );

        // Save subscription record
        await db.collection('subscriptions').updateOne(
          { userId: new ObjectId(userId) },
          {
            $set: {
              userId: new ObjectId(userId),
              stripeSubscriptionId: session.subscription,
              stripeCustomerId: session.customer,
              planKey,
              credits,
              status: 'active',
              activatedAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );

        console.log(`✅ Subscription activated: user=${userId}, plan=${planKey}`);
        break;
      }

      case 'invoice.paid': {
        // Auto-renewal: reset credits for the billing period
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (!subscriptionId) break;
        
        const sub = await db.collection('subscriptions').findOne({ stripeSubscriptionId: subscriptionId });
        if (!sub) break;

        // Only reset credits for renewal invoices (not the first one which is handled by checkout.session.completed)
        if (invoice.billing_reason === 'subscription_cycle') {
          await db.collection('users').updateOne(
            { _id: sub.userId },
            {
              $set: {
                credits: sub.credits,
                subscriptionStatus: 'active',
                updatedAt: new Date(),
              },
            }
          );
          console.log(`🔄 Credits renewed: user=${sub.userId}, credits=${sub.credits}`);
        }
        break;
      }

      case 'invoice.upcoming': {
        // Send reminder email 3 days before renewal
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (!subscriptionId) break;
        
        const sub = await db.collection('subscriptions').findOne({ stripeSubscriptionId: subscriptionId });
        if (!sub) break;

        const user = await db.collection('users').findOne({ _id: sub.userId });
        if (!user?.email) break;

        try {
          const { sendSubscriptionRenewalEmail } = await import('@/lib/email');
          await sendSubscriptionRenewalEmail(user.email, sub.planKey, invoice.amount_due / 100);
          console.log(`📧 Renewal reminder sent to ${user.email}`);
        } catch (e) {
          console.error('Failed to send renewal email:', e);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (!subscriptionId) break;

        const sub = await db.collection('subscriptions').findOne({ stripeSubscriptionId: subscriptionId });
        if (!sub) break;

        await db.collection('users').updateOne(
          { _id: sub.userId },
          { $set: { subscriptionStatus: 'past_due', updatedAt: new Date() } }
        );

        const user = await db.collection('users').findOne({ _id: sub.userId });
        if (user?.email) {
          try {
            const { sendPaymentFailedEmail } = await import('@/lib/email');
            await sendPaymentFailedEmail(user.email);
          } catch (e) {
            console.error('Failed to send payment failed email:', e);
          }
        }
        console.log(`⚠️ Payment failed for subscription: ${subscriptionId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const sub = await db.collection('subscriptions').findOne({ stripeSubscriptionId: subscription.id });
        if (!sub) break;

        await db.collection('users').updateOne(
          { _id: sub.userId },
          {
            $set: {
              plan: 'free',
              credits: 400,
              subscriptionStatus: 'cancelled',
              stripeSubscriptionId: null,
              updatedAt: new Date(),
            },
          }
        );

        await db.collection('subscriptions').updateOne(
          { stripeSubscriptionId: subscription.id },
          { $set: { status: 'cancelled', cancelledAt: new Date() } }
        );

        console.log(`❌ Subscription cancelled: ${subscription.id}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }
}
