import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { fetchRedditPosts } from '@/lib/reddit';
import { filterLeadsByIntent, generateInsights, calcCost } from '@/lib/gemini';
import { selectSubreddits, expandQuery } from '@/lib/queryEngine';
import { sendLeadAlert } from '@/lib/email';
import { ObjectId } from 'mongodb';

// Per-plan lead limits (user-configured)
const PLAN_LIMITS = {
  free:       { maxLeads: 10  },
  starter:    { maxLeads: 50  },
  plus:       { maxLeads: 100 },
  growth:     { maxLeads: 150 },
  pro:        { maxLeads: 300 },
  premium:    { maxLeads: 300 },
  enterprise: { maxLeads: 500 },
};
const DEFAULT_PLAN_LIMIT = 50;

const FALLBACK_SUGGESTIONS = [
  'looking for CRM alternatives',
  'project management tool recommendations',
  'email marketing platform comparison',
  'frustrated with current analytics tool',
  'switching from Salesforce',
  'affordable design tools for freelancers',
  'startup tools for early founders',
  'best tools for remote teams',
];

export async function POST(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const startTime = Date.now();

  try {
    const body = await request.json();
    const { keywords, negativeKeywords, chatId } = body;
    const queryInput = body.query || (Array.isArray(keywords) ? keywords.join(', ') : keywords);

    if (!queryInput?.trim()) {
      return NextResponse.json({ error: 'A search query is required' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(authResult.user.userId);

    // Pre-check credits (at least 1 required to start)
    const userCheck = await db.collection('users').findOne({ _id: userId }, { projection: { credits: 1, plan: 1 } });
    if (!userCheck || userCheck.credits < 1) {
      return NextResponse.json({ error: 'Insufficient credits. Please upgrade your plan.' }, { status: 402 });
    }

    // Get plan limit
    const planConfig = PLAN_LIMITS[userCheck.plan];
    const maxLeads = planConfig ? planConfig.maxLeads : (userCheck.plan === 'free' ? 10 : DEFAULT_PLAN_LIMIT);
    console.log(`🔑 User plan: ${userCheck.plan} → maxLeads: ${maxLeads}`);

    // Merge negative keywords from user settings
    const userFull = await db.collection('users').findOne({ _id: userId }, { projection: { negativeKeywords: 1, emailAlerts: 1, email: 1 } });
    const allNegativeKeywords = [...(negativeKeywords || []), ...(userFull?.negativeKeywords || [])];

    // ── STEP 1: AI selects up to 20 buyer subreddits ──────────────────────────
    const selectedSubreddits = await selectSubreddits(queryInput);

    // ── STEP 2: Expand query into buyer-intent keyword phrases ───────────────
    let expandedQueries = [queryInput];
    try {
      const expansion = await expandQuery(queryInput, selectedSubreddits);
      expandedQueries = [...new Set([queryInput, ...expansion.queries])];
    } catch { /* keep original */ }

    // ── STEP 3: Fetch from Reddit (20 subs, 2-month window, 100 posts/feed) ──
    const posts = await fetchRedditPosts(selectedSubreddits, expandedQueries, allNegativeKeywords);

    // ── STEP 4: AI scores leads (min 7/10 intent threshold) ──────────────────
    let leads = [];
    let insights = null;
    let costInfo = calcCost(0, 0);

    if (posts.length > 0) {
      const result = await filterLeadsByIntent(posts, queryInput);
      leads = result.leads.slice(0, maxLeads);
      costInfo = result.costInfo;

      try { insights = await generateInsights(leads, queryInput); } catch { insights = null; }
    }

    // ── STEP 5: Token-based credit deduction (cost + profit margin) ──────────
    // creditsToCharge already includes the profit margin from calcCost
    const creditsToCharge = Math.max(1, costInfo.creditsToCharge);

    // Atomically deduct credits — fail if insufficient
    const deductResult = await db.collection('users').findOneAndUpdate(
      { _id: userId, credits: { $gte: creditsToCharge } },
      {
        $inc: { credits: -creditsToCharge, searchCount: 1, leadsFound: leads.length },
        $set: { lastActive: new Date() },
      },
      { returnDocument: 'after' }
    );

    if (!deductResult) {
      // Not enough credits even for the cost — deduct at least 1 as minimum
      const minDeduct = await db.collection('users').findOneAndUpdate(
        { _id: userId, credits: { $gte: 1 } },
        { $inc: { credits: -1, searchCount: 1 }, $set: { lastActive: new Date() } },
        { returnDocument: 'after' }
      );
      if (!minDeduct) {
        return NextResponse.json({ error: 'Insufficient credits. Please upgrade your plan.' }, { status: 402 });
      }
    }

    // Get fresh credit balance
    const updatedUser = await db.collection('users').findOne({ _id: userId }, { projection: { credits: 1 } });
    const creditsRemaining = updatedUser?.credits ?? 0;

    // ── STEP 6: Never-empty fallback suggestions ──────────────────────────────
    const suggestedQueries = leads.length === 0
      ? FALLBACK_SUGGESTIONS.sort(() => Math.random() - 0.5).slice(0, 4)
      : [];

    // ── STEP 7: Email alert for critical leads ────────────────────────────────
    if (leads.length > 0 && userFull?.emailAlerts !== false) {
      const topLead = leads.find(l => l.intentScore >= 9);
      if (topLead) sendLeadAlert(userFull.email, topLead).catch(console.error);
    }

    const durationMs = Date.now() - startTime;

    // ── STEP 8: Log search with cost data ─────────────────────────────────────
    await db.collection('searches').insertOne({
      userId,
      query: queryInput,
      expandedQueries,
      selectedSubreddits,
      resultsCount: leads.length,
      totalFetched: posts.length,
      topScore: leads[0]?.intentScore || 0,
      chatId: chatId || null,
      // Cost tracking
      costInfo: {
        rawCostUsd:   costInfo.rawCost,
        totalCostUsd: costInfo.totalCost,
        inputTokens:  costInfo.inputTokens,
        outputTokens: costInfo.outputTokens,
        creditsCharged: creditsToCharge,
        profitUsd: costInfo.totalCost - costInfo.rawCost,
      },
      durationMs,
      timestamp: new Date(),
    });

    // ── STEP 9: Log to ai_usage (for admin analytics) ────────────────────────
    await db.collection('ai_usage').insertOne({
      userId,
      type: 'lead_search',
      postsAnalyzed: posts.length,
      leadsReturned: leads.length,
      subreddits: selectedSubreddits,
      chatId: chatId || null,
      inputTokens:    costInfo.inputTokens,
      outputTokens:   costInfo.outputTokens,
      rawCostUsd:     costInfo.rawCost,
      totalCostUsd:   costInfo.totalCost,
      creditsCharged: creditsToCharge,
      profitUsd:      costInfo.totalCost - costInfo.rawCost,
      durationMs,
      timestamp: new Date(),
    });

    return NextResponse.json({
      leads,
      creditsRemaining,
      creditsCharged: creditsToCharge,
      totalPostsScanned: posts.length,
      expandedQueries,
      selectedSubreddits,
      insights,
      suggestedQueries,
      planLimit: maxLeads,
      costInfo: {
        rawCostUsd:   Number(costInfo.rawCost.toFixed(6)),
        totalCostUsd: Number(costInfo.totalCost.toFixed(6)),
        creditsCharged: creditsToCharge,
      },
    });

  } catch (error) {
    console.error('Search error:', error);
    try {
      const db = await getDb();
      await db.collection('logs').insertOne({
        type: 'error',
        action: 'search',
        error: error.message,
        stack: error.stack?.substring(0, 500),
        userId: authResult.user.userId,
        timestamp: new Date(),
      });
    } catch { /* silent */ }

    return NextResponse.json({ error: 'Search failed. Please try again.' }, { status: 500 });
  }
}
