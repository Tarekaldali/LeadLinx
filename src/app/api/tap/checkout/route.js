import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { createTapCharge, PLAN_PRICES } from '@/lib/tap';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planKey } = await request.json();
    const plan = PLAN_PRICES[planKey];

    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Split name into parts for Tap API
    const nameParts = (user.name || 'User').split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

    // Base URL for redirect and webhook
    // Use x-forwarded-host if available, fallback to NEXTAUTH_URL
    const host = request.headers.get('x-forwarded-host') || process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;

    const chargePayload = {
      amount: plan.amount,
      currency: 'USD',
      customer_initiated: true,
      threeDSecure: true,
      save_card: false,
      description: `LeadLinx ${plan.name} Plan`,
      metadata: { 
        userId: user._id.toString(),
        planKey: planKey,
        credits: plan.credits.toString()
      },
      receipt: { email: true, sms: false },
      reference: { transaction: `txn_${new ObjectId().toString()}` },
      customer: {
        first_name: firstName,
        last_name: lastName,
        email: user.email,
      },
      source: { id: 'src_all' }, // Use src_all to show all payment methods
      post: { url: `${baseUrl}/api/tap/webhook` },
      redirect: { url: `${baseUrl}/checkout/success` }
    };

    const charge = await createTapCharge(chargePayload);

    if (charge.transaction && charge.transaction.url) {
      return NextResponse.json({ url: charge.transaction.url });
    } else {
      console.error('Failed to get transaction URL from Tap:', charge);
      return NextResponse.json({ error: 'Failed to initiate checkout' }, { status: 500 });
    }
  } catch (error) {
    console.error('Tap checkout error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
