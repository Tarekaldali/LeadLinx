import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { extractOmniLeads } from '@/lib/omni-extractor/index.js';
import { calculateMonitorCredits } from '@/lib/creditManager';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes (Pro plan Vercel limit)

/**
 * Surveillance Background Processor
 * This endpoint should be triggered by a CRON job every 15-60 minutes.
 */
export async function GET(request) {
  // Security check: Verify secret token to prevent unauthorized triggers
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== process.env.MONITOR_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const now = new Date();
  const allActiveMonitors = await db.collection('monitors').find({ status: 'active' }).toArray();

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

      // 1. Check user credits first
      const user = await db.collection('users').findOne({ _id: new ObjectId(monitor.userId) });
      if (!user || user.credits < 5) {
         console.log(`⚠️ [Monitor] User ${monitor.userId} out of credits. Pausing monitor.`);
         await db.collection('monitors').updateOne(
           { _id: monitor._id },
           { $set: { status: 'paused', lastError: 'Insufficient credits' } }
         );
         continue;
      }

      // 2. Run Engine (Autonomous Mode)
      // extractOmniLeads now identifies subreddits and keywords automatically
      const engineResult = await extractOmniLeads(monitor.goal, { isPremium: true });

      // 3. Billing Logic (The Economic Engine)
      const creditsToDeduct = calculateMonitorCredits('google/gemini-2.0-flash-001', engineResult.usage);
      console.log(`💰 [Billing] Deducting ${creditsToDeduct} credits for surveillance.`);

      // 4. Save Leads & Deduct Credits (Atomically)
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
            await db.collection('leads').updateOne(
              { userId: lead.userId, link: lead.link },
              { $set: lead },
              { upsert: true }
            );
          } catch (e) { /* ignore single lead error */ }
        }
      }

      // 5. Update Monitor Metadata
      await db.collection('monitors').updateOne(
        { _id: monitor._id },
        { 
          $set: { 
            'stats.lastRun': new Date(),
            'strategy.subreddits': engineResult.route_data.subreddits,
            'strategy.keywords': engineResult.route_data.keywords,
            'updatedAt': new Date()
          },
          $inc: { 
            'stats.leadsFound': sessionLeads.length,
            'stats.totalCreditsSpent': creditsToDeduct
          }
        }
      );

      results.push({ monitorId: monitor._id, leadsFound: sessionLeads.length, cost: creditsToDeduct });

    } catch (error) {
      console.error(`❌ [Monitor] Error processing monitor ${monitor._id}:`, error);
      await db.collection('monitors').updateOne(
        { _id: monitor._id },
        { $set: { lastError: error.message } }
      );
    }
  }

  return NextResponse.json({ 
    success: true, 
    processed: activeMonitors.length, 
    results 
  });
}
