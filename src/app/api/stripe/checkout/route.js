/**
 * POST /api/stripe/checkout — Create Stripe Checkout Session
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { stripe, PLAN_PRICES, getOrCreateCustomer } from '@/lib/stripe';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { planKey } = await request.json();

    if (!planKey || !PLAN_PRICES[planKey]) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const plan = PLAN_PRICES[planKey];
    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    // Get or create Stripe customer (reuses saved payment methods automatically)
    const customerId = await getOrCreateCustomer(
      db,
      userId,
      authResult.user.email,
      authResult.user.name || 'LeadLinx User'
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Checkout Session with recurring subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `LeadLinx ${plan.name} Plan`,
              description: `${plan.credits.toLocaleString()} AI search credits per month`,
            },
            unit_amount: plan.amount,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          planKey,
          credits: plan.credits.toString(),
        },
      },
      metadata: {
        userId: userId.toString(),
        planKey,
        credits: plan.credits.toString(),
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
