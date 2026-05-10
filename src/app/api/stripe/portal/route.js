/**
 * POST /api/stripe/portal — Create Stripe Customer Portal session
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { stripe, getOrCreateCustomer } from '@/lib/stripe';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    const customerId = await getOrCreateCustomer(
      db,
      userId,
      authResult.user.email,
      authResult.user.name || 'LeadLinx User'
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard/settings?tab=billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
