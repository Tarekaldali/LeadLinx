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

    if (!event.id) {
      console.error('❌ [WEBHOOK] No event ID found in payload');
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
    }

    const db = await getDb();
    console.log(`🔔 [WEBHOOK] Received event from Tap Payments: charge ${event.id}`);

    // Verify payload authenticity directly with Tap Payments
    const verifyResponse = await fetch(`https://api.tap.company/v2/charges/${event.id}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TAP_SECRET_KEY}`
      }
    });

    if (!verifyResponse.ok) {
      console.error(`❌ [WEBHOOK] Failed to verify charge ${event.id} with Tap API`);
      return NextResponse.json({ error: 'Charge verification failed' }, { status: 401 });
    }

    const verifiedCharge = await verifyResponse.json();
    console.log(`✅ [WEBHOOK] Charge verified. Status: ${verifiedCharge.status}`);

    const metadata = verifiedCharge.metadata || {};
    const userId = metadata.userId;
    const planKey = metadata.planKey || 'plus';
    const credits = parseInt(metadata.credits || '1000');
    const amount = verifiedCharge.amount;
    const currency = verifiedCharge.currency;

    // Log the transaction in the database
    await db.collection('transactions').insertOne({
      tapChargeId: verifiedCharge.id,
      tapCustomerId: verifiedCharge.customer?.id || null,
      userId: userId ? new ObjectId(userId) : null,
      amount: amount,
      currency: currency,
      status: verifiedCharge.status,
      planKey: planKey,
      metadata: metadata,
      createdAt: new Date(),
    });

    if (verifiedCharge.status === 'DECLINED' || verifiedCharge.status === 'FAILED') {
      console.warn(`⚠️ [WEBHOOK] Payment failed or declined: ${verifiedCharge.status}`);
      // Send payment failed email if user is known
      if (userId) {
        try {
          const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
          if (user?.email) {
            const { sendPaymentFailedEmail } = await import('@/lib/email');
            await sendPaymentFailedEmail(user.email);
          }
        } catch (e) {
          console.error('Failed to send payment failed email:', e);
        }
      }
      return NextResponse.json({ received: true, status: verifiedCharge.status });
    }

    if (verifiedCharge.status === 'CAPTURED' || verifiedCharge.status === 'AUTHORIZED') {
      if (!userId) {
        console.error('❌ [WEBHOOK] No userId found in charge metadata');
        return NextResponse.json({ error: 'Missing userId in metadata' }, { status: 400 });
      }

      console.log(`📦 [WEBHOOK] Charge successful for user: ${userId}, plan: ${planKey}`);

      // Calculate Period End (30 days from now)
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

      // Update User
      const userUpdateResult = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            plan: planKey,
            credits: credits,
            tapChargeId: verifiedCharge.id,
            tapCustomerId: verifiedCharge.customer?.id || null,
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
            await sendThankYouEmail({
              email: user.email,
              name: user.name || 'Customer',
              planName: planKey.charAt(0).toUpperCase() + planKey.slice(1),
              amount: amount,
              currency: currency,
              chargeId: verifiedCharge.id,
              status: verifiedCharge.status,
              date: new Date()
            });
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
            tapChargeId: verifiedCharge.id,
            tapCustomerId: verifiedCharge.customer?.id || null,
            planKey: planKey,
            credits,
            status: 'active',
            cancel_at_period_end: false,
            currentPeriodEnd: currentPeriodEnd,
            activatedAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      console.log(`✅ [WEBHOOK] Subscription record saved for user: ${userId}`);
    } else {
      console.log(`⚠️ [WEBHOOK] Ignored verified event status: ${verifiedCharge.status}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
