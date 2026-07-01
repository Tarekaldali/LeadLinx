import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET(request) {
  try {
    const db = await getDb();
    
    // For testing purposes, we'll find or create a dummy subscription
    // that is "expired" or reaching its currentPeriodEnd
    let testSub = await db.collection('subscriptions').findOne({ isTestMock: true });
    
    if (!testSub) {
      // Create it if it doesn't exist
      const newSub = {
        userId: 'test_user_id',
        planKey: 'pro',
        status: 'active',
        cancel_at_period_end: false,
        currentPeriodEnd: new Date(Date.now() - 10000), // Expired 10 seconds ago
        isTestMock: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('subscriptions').insertOne(newSub);
      testSub = newSub;
    } else {
      // Make sure it's expired for the test
      await db.collection('subscriptions').updateOne(
        { _id: testSub._id },
        { $set: { currentPeriodEnd: new Date(Date.now() - 10000) } }
      );
      testSub.currentPeriodEnd = new Date(Date.now() - 10000);
    }

    // Now, run the Renewal Logic on all expired subscriptions (including our mock)
    const now = new Date();
    const expiredSubscriptions = await db.collection('subscriptions').find({
      status: 'active',
      currentPeriodEnd: { $lte: now }
    }).toArray();

    const results = {
      totalFound: expiredSubscriptions.length,
      renewed: [],
      canceled: [],
      errors: []
    };

    for (const sub of expiredSubscriptions) {
      try {
        if (sub.cancel_at_period_end) {
          // REVOKE ACCESS
          await db.collection('subscriptions').updateOne(
            { _id: sub._id },
            { 
              $set: { 
                status: 'canceled', 
                planKey: 'free',
                updatedAt: new Date()
              } 
            }
          );
          
          // Also update the user's plan in users collection
          if (sub.userId !== 'test_user_id') {
            await db.collection('users').updateOne(
              { _id: sub.userId },
              { $set: { plan: 'free' } }
            );
          }
          
          results.canceled.push(sub._id);
        } else {
          // RE-CHARGE / RENEW
          // Since we use Tap Payments without saved card tokens (basic checkout),
          // real automated rebilling would require Tap's recurring payments API and customer tokens.
          // For this mock test, we simulate a successful charge and extend the period by 30 days.
          
          const newPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
          
          await db.collection('subscriptions').updateOne(
            { _id: sub._id },
            { 
              $set: { 
                currentPeriodEnd: newPeriodEnd,
                updatedAt: new Date()
              } 
            }
          );
          
          results.renewed.push(sub._id);
          
          // Optionally, we could log a simulated transaction here
          await db.collection('transactions').insertOne({
            userId: sub.userId,
            tapChargeId: 'sim_charge_' + Date.now(),
            amount: 0, // Mock amount
            currency: 'USD',
            status: 'CAPTURED',
            planKey: sub.planKey,
            isTestMock: true,
            createdAt: new Date()
          });
        }
      } catch (err) {
        results.errors.push({ id: sub._id, error: err.message });
      }
    }

    // Toggle the cancel_at_period_end for the next test run
    if (testSub) {
      await db.collection('subscriptions').updateOne(
        { isTestMock: true },
        { $set: { cancel_at_period_end: !testSub.cancel_at_period_end } }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription renewal cron simulated successfully',
      results,
      nextTestWillCancel: !testSub.cancel_at_period_end
    });

  } catch (error) {
    console.error('Test Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
