import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cancelAutoRenewal } = await request.json();

    if (typeof cancelAutoRenewal !== 'boolean') {
      return NextResponse.json({ error: 'Invalid parameter' }, { status: 400 });
    }

    const db = await getDb();
    
    await db.collection('subscriptions').updateOne(
      { userId: new ObjectId(session.user.id) },
      {
        $set: {
          cancel_at_period_end: cancelAutoRenewal,
          updatedAt: new Date()
        }
      }
    );

    // Also update the user's subscriptionStatus field if needed, but normally we just keep them active
    // until the actual period end script runs. For now, just recording the preference is enough.

    return NextResponse.json({ success: true, cancel_at_period_end: cancelAutoRenewal });
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
