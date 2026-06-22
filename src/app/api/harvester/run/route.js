/**
 * LeadHarvester API — /api/harvester/run
 * Launches a lead extraction job. Protected by auth.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { runHarvestJob, formatLeadsForUI } from '@/lib/harvester/lead-extractor';

export async function POST(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const {
      query,
      mode = 'heuristics',
      depth = 1,
      maxPages = 12,
      maxUrls = 6,
      noEnrich = false,
      dryRun = false,
      syncCrm = false,
    } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: 'A search query is required.' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    // Check credits
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user || user.credits < 1) {
      return NextResponse.json({ error: 'Insufficient credits.' }, { status: 402 });
    }

    // Run the harvest job
    const result = await runHarvestJob({
      query,
      mode,
      db,
      userId,
      options: { depth, maxPages, maxUrls, noEnrich, dryRun, syncCrm },
    });

    // Deduct credits based on actual AI usage when available
    const usage = { prompt_tokens: result.stats.aiTokensIn || 0, completion_tokens: result.stats.aiTokensOut || 0 };
    let creditsToDeduct = 1;
    if ((usage.prompt_tokens || 0) + (usage.completion_tokens || 0) > 0) {
      creditsToDeduct = calculateCreditsToDeduct('deepseek/deepseek-chat', usage, user?.plan || 'free');
    } else {
      // Fallback legacy behavior
      creditsToDeduct = mode === 'llm' ? Math.max(2, result.leads.length) : 1;
    }
    await db.collection('users').updateOne(
      { _id: userId },
      {
        $inc: { credits: -creditsToDeduct },
        $set: { updatedAt: new Date() },
      }
    );

    const updatedUser = await db.collection('users').findOne({ _id: userId });

    // Format leads for the UI
    const formattedLeads = formatLeadsForUI(result);

    return NextResponse.json({
      status: 'completed',
      jobId: result.jobId,
      query: result.query,
      mode: result.mode,
      leads: formattedLeads,
      stats: result.stats,
      creditsRemaining: updatedUser?.credits ?? 0,
    });

  } catch (error) {
    console.error('[Harvester API] Error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Lead extraction failed.' },
      { status: 500 }
    );
  }
}
