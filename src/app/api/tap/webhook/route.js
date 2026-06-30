import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  try {
    const body = await request.text();
    let event;
    
    try {
      event = JSON.parse(body);
    } catch (err) {
      console.error(`❌ [WEBHOOK] Parse failed: ${err.message}`);
      return NextResponse.json({ error: 'Webhook parse failed' }, { status: 400 });
    }

    const db = await getDb();
    console.log(`🔔 [WEBHOOK] Received event from Tap Payments: charge ${event.id}, status: ${event.status}`);

    // Tap charge status can be CAPTURED, AUTHORIZED, INITIATED, etc.
    // We only care about successful payments (CAPTURED)
    if (event.status === 'CAPTURED' || event.status === 'AUTHORIZED') {
      const metadata = event.metadata || {};
      const userId = metadata.userId;
      const planKey = metadata.planKey;
      const credits = parseInt(metadata.credits || '1000');

      if (!userId) {
        console.error('❌ [WEBHOOK] No userId found in charge metadata');
        return NextResponse.json({ error: 'Missing userId in metadata' }, { status: 400 });
      }

      console.log(`📦 [WEBHOOK] Charge successful for user: ${userId}, plan: ${planKey}`);

      // Update User
      const userUpdateResult = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            plan: planKey || 'plus',
            credits: credits,
            tapChargeId: event.id,
            tapCustomerId: event.customer?.id || null,
            subscriptionStatus: 'active',
            updatedAt: new Date(),
          },
        }
      );

      if (userUpdateResult.matchedCount === 0) {
        console.error(`❌ [WEBHOOK] No user found in DB with ID: ${userId}`);
      } else {
        console.log(`✅ [WEBHOOK] User plan updated in DB: ${userId}`);
        
        // Send Thank You Email
        try {
          const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
          if (user?.email) {
            const { sendThankYouEmail } = await import('@/lib/email');
            const amount = event.amount;
            await sendThankYouEmail(user.email, planKey.charAt(0).toUpperCase() + planKey.slice(1), amount);
          }
        } catch (e) {
          console.error('Failed to send thank you email in webhook:', e);
        }
      }

      // Save subscription record
      await db.collection('subscriptions').updateOne(
        { userId: new ObjectId(userId) },
        {
          $set: {
            userId: new ObjectId(userId),
            tapChargeId: event.id,
            tapCustomerId: event.customer?.id || null,
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
    } else {
      console.log(`⚠️ [WEBHOOK] Ignored event status: ${event.status}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
