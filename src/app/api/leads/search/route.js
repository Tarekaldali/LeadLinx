/**
 * LeadLinx Search API — /api/leads/search
 * V3: Powered by LeadHarvester (Web Crawl + AI Classification)
 *
 * Replaces the legacy Reddit scraping engine. Now discovers company
 * websites, crawls them, extracts contact info, classifies with AI,
 * deduplicates, scores, and returns formatted leads.
 *
 * Flow:
 *   1. Classify intent (CHAT vs SEARCH)
 *   2. If SEARCH → run harvester pipeline
 *   3. Return leads in the format ChatMessage.js expects
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { classifyIntent } from '@/lib/aiOrchestrator';
import { ObjectId } from 'mongodb';
import { calcCost } from '@/lib/gemini';
import { sendSearchCompletionEmail } from '@/lib/email';

export async function POST(request) {
  const authResult = await requireAuth();
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const query = body.query;
    const chatId = body.chatId;

    if (!query?.trim()) {
      return NextResponse.json({ error: 'A search query is required' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    // 1. Pre-check credits & Plan Limitations
    const user = await db.collection('users').findOne({ _id: userId });
    
    // Check if subscription exists and is active (if required by business logic)
    const subscription = await db.collection('subscriptions').findOne({ userId });
    const isPremium = subscription && subscription.status === 'active';
    
    // Free plan max limits
    if (!isPremium && user.credits < 1) {
      return NextResponse.json({ error: 'Insufficient credits. Please upgrade your plan.' }, { status: 402 });
    }

    // 2. Intent Classification
    const classification = await classifyIntent(query);
    console.log('🎯 Intent Classification:', classification);

    if (classification.intent === 'CHAT') {
      const aiResponse = classification.response_message || 'How can I help you find leads today?';
      return NextResponse.json({ status: 'chat', message: aiResponse }, { status: 200 });
    }

    // 3. Run Omni-Extractor pipeline
    console.log(`🚀 Running Omni-Extractor for: "${query}"`);
    
    // Import omni dynamically so we don't break if files are moving
    const { extractOmniLeads } = await import('@/lib/omni-extractor/index.js');
    
    // Pass isPremium flag to allow aggressive fetching
    const result = await extractOmniLeads(query, { isPremium });

    // 4. Smart Credit Deduction (1 credit base + 1 per 5 high-intent leads)
    const baseCost = 1;
    const leadCost = Math.floor(result.leads.length / 5);
    const totalCost = baseCost + leadCost;

    await db.collection('users').updateOne(
      { _id: userId },
      {
        $inc: { credits: -totalCost },
        $set: { updatedAt: new Date() },
      }
    );

    const updatedUser = await db.collection('users').findOne({ _id: userId });

    // Send email notification (non-blocking)
    if (result.leads.length > 0 && authResult.user.email) {
      sendSearchCompletionEmail(authResult.user.email, result.leads.length, query).catch(e => console.error(e));
    }

    // 5. Format leads for the ChatMessage UI component
    const leads = result.leads.map(l => ({
      id: l.id,
      author: l.author || 'Unknown',
      company: l.company || '',
      title: l.title || '',
      body: l.reasoning || '',
      link: l.link || '#',
      subreddit: l.source,
      emails: l.emails || [],
      phones: l.phones || [],
      socials: l.socials || [],
      score: l.score || 0,
      leadType: result.route_data?.targetType === 'b2c' ? 'B2C (Consumer)' : 'B2B (Business)',
    }));

    // 6. Log search for analytics
    await db.collection('searches').insertOne({
      userId,
      query,
      chatId: chatId || null,
      status: 'completed',
      searchPlan: {
        mode: result.mode,
        discoveredUrls: result.stats.urlsDiscovered,
        search_queries: [query],
      },
      leadCount: leads.length,
      stats: result.stats,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 7. Build insights from results
    const insights = generateInsights(result);

    // 8. Return in existing dashboard format
    return NextResponse.json({
      status: 'completed',
      searchId: result.jobId,
      leads,
      insights,
      totalScanned: result.stats.pagesCrawled,
      creditsRemaining: updatedUser?.credits ?? 0,
      searchQueries: [query],
      selectedSubreddits: [], // No subreddits — we crawl the web now
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message || 'Search failed.' }, { status: 500 });
  }
}

/**
 * Generate market intelligence insights from harvest results.
 */
function generateInsights(result) {
  if (!result.leads.length) return null;

  const leads = result.leads;

  // Extract unique companies
  const companies = [...new Set(leads.map(l => l.company).filter(Boolean))];

  // Extract industries from enrichment data
  const industries = [...new Set(
    leads
      .map(l => l.enrichment_data?.industry_guess || l.enrichment_data?.clearbit?.industry)
      .filter(Boolean)
  )];

  // Count signal types
  const emailCount = leads.filter(l => l.emails?.length > 0).length;
  const phoneCount = leads.filter(l => l.phones?.length > 0).length;

  return {
    topPainPoints: [
      `Found ${emailCount} leads with verified email addresses`,
      `Found ${phoneCount} leads with direct phone numbers`,
      `Crawled ${result.stats.pagesCrawled} pages across ${result.stats.urlsDiscovered} websites`,
      leads.some(l => l.score >= 80) ? `${leads.filter(l => l.score >= 80).length} HOT leads (score 80+) ready for outreach` : null,
    ].filter(Boolean),
    saasIdeas: [
      companies.length > 0 ? `Companies found: ${companies.slice(0, 5).join(', ')}` : null,
      industries.length > 0 ? `Industries: ${industries.slice(0, 5).join(', ')}` : null,
      `${result.stats.duplicatesFiltered} duplicate contacts filtered out`,
    ].filter(Boolean),
  };
}
