import { NextResponse } from 'next/server'; // v1.0.2
import { getDb } from '@/lib/mongodb';
import { extractOmniLeads } from '@/lib/omni-extractor/index.js';
import { calculateMonitorCredits } from '@/lib/creditManager';
import { sendMonitorThresholdEmail } from '@/lib/email';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes (Pro plan Vercel limit)

/**
 * Surveillance Background Processor
 * Triggered by Vercel Cron (vercel.json) or manually from the dashboard "Run Now" button.
 * Auth: Uses Vercel's native CRON_SECRET header, OR a custom secret query param for manual triggers.
 */
export async function GET(request) {
  // Vercel Cron sends its secret as a header: x-vercel-cron-secret
  const vercelCronSecret = request.headers.get('x-vercel-cron-secret');
  // Allow manual "Run Now" trigger with secret param OR if running locally
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get('secret');
  
  const isVercelCron = vercelCronSecret === process.env.CRON_SECRET;
  const isManualRun = querySecret === (process.env.MONITOR_SECRET || 'leadlinx-monitor-run');
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (!isVercelCron && !isManualRun && !isDev) {
    console.warn('[Monitor Processor] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const now = new Date();
  
  // Cleanup: Reset any monitors that got stuck in "processing: true" for more than 15 minutes due to Vercel timeouts
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  await db.collection('monitors').updateMany(
    { status: 'active', processing: true, updatedAt: { $lt: fifteenMinutesAgo } },
    { $set: { processing: false, lastError: 'Reset after timeout' } }
  );

  const allActiveMonitors = await db.collection('monitors').find({ status: 'active', processing: { $ne: true } }).toArray();

  // Filter monitors based on frequency
  const activeMonitors = allActiveMonitors.filter(monitor => {
    if (!monitor.stats?.lastRun) return true; // Never run before
    
    const frequencyMinutes = monitor.frequency || 60; // Default 1 hour
    const lastRunTime = new Date(monitor.stats.lastRun).getTime();
    const nextRunTime = lastRunTime + (frequencyMinutes * 60 * 1000);
    
    return now.getTime() >= nextRunTime;
  });

  if (activeMonitors.length === 0) {
    return NextResponse.json({ 
      success: true, 
      message: 'No monitors due for processing at this time.',
      totalActive: allActiveMonitors.length
    });
  }

  console.log(`📡 [Surveillance] Found ${activeMonitors.length} monitors due for processing.`);
  
  const results = [];
  for (const monitor of activeMonitors) {
    try {
      console.log(`🕵️ [Monitor] Processing: "${monitor.goal}" for User: ${monitor.userId}`);

      // Lock monitor to prevent concurrent processing
      await db.collection('monitors').updateOne(
        { _id: monitor._id },
        { $set: { processing: true } }
      );

      // 1. Check user credits first
      // monitor.userId may be stored as ObjectId or string — handle both
      let userObjectId;
      try {
        userObjectId = ObjectId.isValid(monitor.userId) ? new ObjectId(monitor.userId) : monitor.userId;
      } catch {
        userObjectId = monitor.userId;
      }
      const user = await db.collection('users').findOne({ _id: userObjectId });
      if (!user || user.credits < 5) {
         console.log(`⚠️ [Monitor] User ${monitor.userId} out of credits. Pausing monitor.`);
         await db.collection('monitors').updateOne(
           { _id: monitor._id },
           { $set: { status: 'paused', lastError: 'Insufficient credits' } }
         );
      } else {
        // 2. Run Engine (Autonomous Mode)
        // extractOmniLeads now identifies subreddits and keywords automatically
        const engineResult = await extractOmniLeads(monitor.goal, { isPremium: true });

        // 3. Billing Logic (The Economic Engine)
        const creditsToDeduct = calculateMonitorCredits('google/gemini-2.0-flash-001', engineResult.usage);
        console.log(`💰 [Billing] Deducting ${creditsToDeduct} credits for surveillance.`);

        // 4. Save Leads & Deduct Credits (Atomically)
        let newlyFoundLeadsCount = 0;
        const sessionLeads = engineResult.leads.map(lead => ({
          ...lead,
          userId: monitor.userId,
          monitorId: monitor._id,
          createdAt: new Date(),
          isFromMonitor: true
        }));

        // Update User Credits
        await db.collection('users').updateOne(
          { _id: user._id, credits: { $gte: creditsToDeduct } },
          { $inc: { credits: -creditsToDeduct } }
        );

        // Store New Leads (with duplicate prevention)
        if (sessionLeads.length > 0) {
          for (const lead of sessionLeads) {
            try {
              const upResult = await db.collection('leads').updateOne(
                { userId: lead.userId, link: lead.link },
                { $setOnInsert: lead },
                { upsert: true }
              );
              if (upResult.upsertedCount > 0) {
                newlyFoundLeadsCount++;
              }
            } catch (e) { /* ignore single lead error */ }
          }
        }

        // 5. Check Threshold Alert
        const totalLeadsNow = (monitor.stats?.leadsFound || 0) + sessionLeads.length;
        if (
          monitor.emailAlert?.enabled && 
          totalLeadsNow >= monitor.emailAlert.threshold && 
          !monitor.emailAlert?.alertSent
        ) {
          console.log(`📧 [Alert] Threshold reached for monitor ${monitor._id}. Sending email.`);
          const sent = await sendMonitorThresholdEmail(user.email, monitor, totalLeadsNow);
          
          if (sent) {
            // Mark alert as sent to avoid spamming
            await db.collection('monitors').updateOne(
              { _id: monitor._id },
              { $set: { 'emailAlert.alertSent': true } }
            );
          }
        }

        // 6. Update Monitor Metadata
        await db.collection('monitors').updateOne(
          { _id: monitor._id },
          { 
            $set: { 
              'stats.lastRun': new Date(),
              'strategy.subreddits': engineResult.route_data.subreddits,
              'strategy.keywords': engineResult.route_data.keywords,
              'updatedAt': new Date(),
              'processing': false
            },
            $inc: { 
              'stats.leadsFound': newlyFoundLeadsCount,
              'stats.totalCreditsSpent': creditsToDeduct
            }
          }
        );

        results.push({ monitorId: monitor._id, leadsFound: sessionLeads.length, cost: creditsToDeduct });
      }

    } catch (error) {
      console.error(`❌ [Monitor] Error processing monitor ${monitor._id}:`, error);
      await db.collection('monitors').updateOne(
        { _id: monitor._id },
        { $set: { lastError: error.message, processing: false } }
      );
    }
  }

  return NextResponse.json({ 
    success: true, 
    processed: activeMonitors.length, 
    results 
  });
}
