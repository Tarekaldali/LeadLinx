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
import { stripe } from '@/lib/stripe';

export async function POST(request) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    let event;
    
    // If webhook secret is set, verify signature; otherwise accept (dev mode)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err) {
        console.error(`❌ [WEBHOOK] Signature verification failed: ${err.message}`);
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
      }
    } else {
      console.log('⚠️ [WEBHOOK] No signature or secret found, parsing body directly');
      event = JSON.parse(body);
    }

    const db = await getDb();
    console.log(`🔔 [WEBHOOK] Received event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planKey = session.metadata?.planKey;
        const credits = parseInt(session.metadata?.credits || '1000');

        console.log(`📦 [WEBHOOK] Checkout session completed for user: ${userId}, plan: ${planKey}`);

        if (!userId) {
          console.error('❌ [WEBHOOK] No userId found in session metadata');
          break;
        }

        if (!planKey) {
          console.warn('⚠️ [WEBHOOK] No planKey found in session metadata, defaulting to plus');
        }

        // Update User
        const userUpdateResult = await db.collection('users').updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              plan: planKey || 'plus',
              credits: credits,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              subscriptionStatus: 'active',
              updatedAt: new Date(),
            },
          }
        );

        if (userUpdateResult.matchedCount === 0) {
          console.error(`❌ [WEBHOOK] No user found in DB with ID: ${userId}`);
        } else {
          console.log(`✅ [WEBHOOK] User plan updated in DB: ${userId}`);
        }

        // Save subscription record
        await db.collection('subscriptions').updateOne(
          { userId: new ObjectId(userId) },
          {
            $set: {
              userId: new ObjectId(userId),
              stripeSubscriptionId: session.subscription,
              stripeCustomerId: session.customer,
              planKey: planKey || 'plus',
              credits,
              status: 'active',
              activatedAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );

        console.log(`✅ [WEBHOOK] Subscription record saved for user: ${userId}`);
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
