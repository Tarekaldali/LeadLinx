import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { getDb } from '@/lib/mongodb';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chargeId, amount, currency, reason, userId } = await request.json();

    if (!chargeId || !amount || !currency) {
      return NextResponse.json({ error: 'Missing required refund parameters' }, { status: 400 });
    }

    // Call Tap Payments Refund API
    const refundResponse = await fetch('https://api.tap.company/v2/refunds', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        Authorization: `Bearer ${process.env.TAP_SECRET_KEY}`
      },
      body: JSON.stringify({
        charge_id: chargeId,
        amount: amount,
        currency: currency,
        reason: reason || 'Requested by admin'
      })
    });

    const refundData = await refundResponse.json();

    if (!refundResponse.ok) {
      console.error('Tap Refund Error:', refundData);
      return NextResponse.json({ error: refundData?.errors?.[0]?.description || 'Failed to process refund with Tap Payments' }, { status: refundResponse.status });
    }

    const db = await getDb();

    // If refund is successful or pending, we update the user's subscription
    if (userId) {
      const { ObjectId } = require('mongodb');
      
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            plan: 'free',
            credits: 10,
            subscriptionStatus: 'cancelled',
            updatedAt: new Date()
          }
        }
      );

      await db.collection('subscriptions').updateOne(
        { userId: new ObjectId(userId) },
        {
          $set: {
            status: 'refunded',
            updatedAt: new Date()
          }
        }
      );
    }
    
    // Also update the transaction status
    await db.collection('transactions').updateOne(
      { tapChargeId: chargeId },
      {
        $set: {
          status: 'REFUNDED',
          refundId: refundData.id,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ success: true, refund: refundData });
  } catch (error) {
    console.error('Failed to process refund:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
