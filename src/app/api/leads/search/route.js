/**
 * LeadLinx Search API — /api/leads/search
 * Starts a persisted extraction job and lets Next.js `after()` finish it
 * independently of client-side navigation.
 */

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { after, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { classifyIntent } from '@/lib/aiOrchestrator';
import { ObjectId } from 'mongodb';
import { sendSearchCompletionEmail } from '@/lib/email';

export async function POST(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const query = body.query?.trim();
    const chatId = body.chatId;
    const assistantMessageId = body.assistantMessageId;

    if (!query) {
      return NextResponse.json({ error: 'A search query is required' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);
    const user = await db.collection('users').findOne({ _id: userId });

    if (!user || user.credits < 1) {
      return NextResponse.json({ error: 'Insufficient credits. Please top up your balance or upgrade your plan.' }, { status: 402 });
    }

    await db.collection('users').updateOne(
      { _id: userId, credits: { $gt: 0 } },
      { $inc: { credits: -1 }, $set: { updatedAt: new Date() } }
    );

    const classificationResult = await classifyIntent(query);
    const classification = classificationResult.data || { intent: 'SEARCH', response_message: '' };
    console.log('🎯 Intent Classification:', classification);

    const { getRawCost } = await import('@/lib/creditManager.js');

    if (classification.intent === 'CHAT') {
      const aiResponse = classification.response_message || 'How can I help you find leads today?';
      const chatUsage = classificationResult.usage || { prompt_tokens: 0, completion_tokens: 0 };
      const rawCostUsd = getRawCost('deepseek/deepseek-chat', chatUsage);

      await db.collection('ai_usage').insertOne({
        userId,
        chatId: chatId && ObjectId.isValid(chatId) ? new ObjectId(chatId) : null,
        type: 'chat',
        query,
        totalUsage: chatUsage,
        rawCostUsd,
        totalCostUsd: rawCostUsd * 10,
        profitUsd: rawCostUsd * 9,
        creditsCharged: 1,
        leadsReturned: 0,
        postsAnalyzed: 0,
        plan: user?.plan || 'free',
        timestamp: new Date()
      });

      await updateChatMessage(db, {
        userId,
        chatId,
        assistantMessageId,
        patch: {
          status: 'chat',
          content: aiResponse,
          leads: [],
          insights: null,
          updatedAt: new Date(),
        }
      });

      return NextResponse.json({ status: 'chat', message: aiResponse, creditsRemaining: Math.max(0, user.credits - 1) }, { status: 200 });
    }

    const subscription = await db.collection('subscriptions').findOne({ userId });
    const isPremium = subscription?.status === 'active';

    const searchLog = {
      userId,
      query,
      chatId: chatId && ObjectId.isValid(chatId) ? new ObjectId(chatId) : null,
      status: 'processing',
      progress: {
        stage: 'queued',
        message: 'Extraction queued and running in the background.',
        percent: 5,
      },
      searchPlan: { search_queries: [query] },
      leadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const searchResult = await db.collection('searches').insertOne(searchLog);
    const searchId = searchResult.insertedId.toString();

    await updateChatMessage(db, {
      userId,
      chatId,
      assistantMessageId,
      patch: {
        searchId,
        status: 'processing',
        content: query,
        leads: [],
        insights: null,
        progress: searchLog.progress,
        updatedAt: new Date(),
      }
    });

    after(async () => {
      await runSearchJob({
        query,
        userId: userId.toString(),
        userEmail: authResult.user.email,
        userPlan: user?.plan || 'free',
        searchId,
        chatId,
        assistantMessageId,
        classificationUsage: classificationResult.usage || { prompt_tokens: 0, completion_tokens: 0 },
        isPremium,
      });
    });

    return NextResponse.json({
      status: 'processing',
      searchId,
      leads: [],
      insights: null,
      totalScanned: 0,
      creditsRemaining: Math.max(0, user.credits - 1),
      searchQueries: [query],
      selectedSubreddits: [],
      progress: searchLog.progress,
    }, { status: 202 });

  } catch (error) {
    console.error('Search start error:', error);
    return NextResponse.json({ error: error.message || 'Search failed.' }, { status: 500 });
  }
}

async function runSearchJob({ query, userId, userEmail, userPlan, searchId, chatId, assistantMessageId, classificationUsage, isPremium }) {
  const db = await getDb();
  const userObjectId = new ObjectId(userId);
  const searchObjectId = new ObjectId(searchId);

  try {
    await db.collection('searches').updateOne(
      { _id: searchObjectId, userId: userObjectId },
      {
        $set: {
          status: 'processing',
          progress: {
            stage: 'extracting',
            message: 'Searching Reddit posts and comments for buyer intent.',
            percent: 20,
          },
          updatedAt: new Date(),
        }
      }
    );

    const { extractOmniLeads } = await import('@/lib/omni-extractor/index.js');
    const result = await extractOmniLeads(query, {
      isPremium,
      targetLeads: 50,
      maxToValidate: isPremium ? 500 : 400,
      extractionMs: 90000,
      validationMs: 180000,
    });

    const combinedUsage = {
      prompt_tokens: (classificationUsage?.prompt_tokens || 0) + (result.usage?.prompt_tokens || 0),
      completion_tokens: (classificationUsage?.completion_tokens || 0) + (result.usage?.completion_tokens || 0)
    };

    const { calculateCreditsToDeduct, getRawCost } = await import('@/lib/creditManager.js');
    const totalCost = calculateCreditsToDeduct('deepseek/deepseek-chat', combinedUsage, userPlan);
    const remainingToDeduct = Math.max(0, totalCost - 1);

    if (remainingToDeduct > 0) {
      await db.collection('users').updateOne(
        { _id: userObjectId, credits: { $gte: remainingToDeduct } },
        { $inc: { credits: -remainingToDeduct }, $set: { updatedAt: new Date() } }
      );
    }

    const updatedUser = await db.collection('users').findOne({ _id: userObjectId });
    const leads = formatLeads(result, searchObjectId, userObjectId, chatId, query);
    const insights = generateInsights(result);
    const rawCostUsd = getRawCost('deepseek/deepseek-chat', combinedUsage);

    await db.collection('ai_usage').insertOne({
      userId: userObjectId,
      chatId: chatId && ObjectId.isValid(chatId) ? new ObjectId(chatId) : null,
      type: 'lead_search',
      query,
      totalUsage: combinedUsage,
      rawCostUsd,
      totalCostUsd: rawCostUsd * 10,
      profitUsd: rawCostUsd * 9,
      creditsCharged: totalCost,
      leadsReturned: leads.length,
      postsAnalyzed: result.stats?.pagesCrawled || 0,
      plan: userPlan,
      timestamp: new Date()
    });

    if (leads.length > 0) {
      try {
        await db.collection('leads').insertMany(leads, { ordered: false });
      } catch (error) {
        if (error.code !== 11000) console.error('Lead storage error:', error);
      }
    }

    const completedPatch = {
      status: 'completed',
      leadCount: leads.length,
      stats: result.stats,
      totalScanned: result.stats?.pagesCrawled || 0,
      insights,
      selectedSubreddits: result.route_data?.subreddits || [],
      searchQueries: result.route_data?.searchQueries || result.route_data?.keywords || [query],
      searchPlan: {
        mode: result.mode,
        discoveredUrls: result.stats?.urlsDiscovered || 0,
        search_queries: result.route_data?.searchQueries || [query],
      },
      progress: {
        stage: 'completed',
        message: `Found ${leads.length} qualified leads.`,
        percent: 100,
      },
      updatedAt: new Date(),
    };

    await db.collection('searches').updateOne(
      { _id: searchObjectId, userId: userObjectId },
      { $set: completedPatch }
    );

    await updateChatMessage(db, {
      userId: userObjectId,
      chatId,
      assistantMessageId,
      patch: {
        status: 'completed',
        content: query,
        searchId,
        leads: stripDbFields(leads),
        insights,
        totalScanned: completedPatch.totalScanned,
        selectedSubreddits: completedPatch.selectedSubreddits,
        searchQueries: completedPatch.searchQueries,
        creditsRemaining: updatedUser?.credits ?? 0,
        progress: completedPatch.progress,
        updatedAt: new Date(),
      }
    });

    if (leads.length > 0 && userEmail) {
      sendSearchCompletionEmail(userEmail, leads.length, query).catch(error => console.error(error));
    }
  } catch (error) {
    console.error('Background search error:', error);
    await db.collection('searches').updateOne(
      { _id: searchObjectId, userId: userObjectId },
      {
        $set: {
          status: 'failed',
          error: error.message || 'Search failed.',
          progress: {
            stage: 'failed',
            message: error.message || 'Search failed.',
            percent: 100,
          },
          updatedAt: new Date(),
        }
      }
    );

    await updateChatMessage(db, {
      userId: userObjectId,
      chatId,
      assistantMessageId,
      patch: {
        status: 'failed',
        error: error.message || 'Search failed.',
        searchId,
        updatedAt: new Date(),
      }
    });
  }
}

async function updateChatMessage(db, { userId, chatId, assistantMessageId, patch }) {
  if (!chatId || !ObjectId.isValid(chatId) || !assistantMessageId) return;

  try {
    await db.collection('chats').updateOne(
      {
        _id: new ObjectId(chatId),
        userId,
        'messages.id': assistantMessageId,
      },
      {
        $set: Object.fromEntries(
          Object.entries(patch).map(([key, value]) => [`messages.$.${key}`, value])
        )
      }
    );
  } catch (error) {
    console.error('Chat message update failed:', error);
  }
}

function formatLeads(result, searchId, userId, chatId, query) {
  return result.leads.map(lead => ({
    userId,
    searchId,
    chatId: chatId && ObjectId.isValid(chatId) ? new ObjectId(chatId) : null,
    searchQuery: query,
    leadId: lead.id,
    id: lead.id,
    author: lead.author || 'Unknown',
    company: lead.company || '',
    title: lead.title || '',
    body: lead.body || lead.reasoning || '',
    link: lead.link || '#',
    source: lead.subreddit || lead.source || 'reddit',
    subreddit: lead.subreddit || lead.source || 'reddit',
    emails: lead.emails || [],
    phones: lead.phones || [],
    socials: lead.socials || [],
    score: lead.score || 0,
    type: lead.type || 'Solution-Seeking',
    suggestedReply: lead.suggestedReply || '',
    leadType: result.route_data?.targetType === 'b2c' ? 'B2C (Consumer)' : 'B2B (Business)',
    createdAt: new Date(),
  }));
}

function stripDbFields(leads) {
  return leads.map(({ userId, searchId, chatId, searchQuery, leadId, createdAt, source, ...lead }) => ({
    ...lead,
    source,
    subreddit: lead.subreddit || source || 'reddit',
  }));
}

function generateInsights(result) {
  if (!result.leads.length) return null;

  const leads = result.leads;
  const emailCount = leads.filter(lead => lead.emails?.length > 0).length;
  const redditContactCount = leads.filter(lead => lead.socials?.some(social => social.startsWith('reddit:@'))).length;
  const hotCount = leads.filter(lead => lead.score >= 8).length;

  return {
    topPainPoints: [
      `Found ${hotCount} hot leads with strong buying intent`,
      `Found ${redditContactCount} Reddit usernames ready for direct outreach`,
      emailCount > 0 ? `Found ${emailCount} leads with email addresses` : null,
      `Analyzed ${result.stats?.pagesCrawled || 0} Reddit signals`,
    ].filter(Boolean),
    saasIdeas: [
      `${result.stats?.duplicatesFiltered || 0} low-quality or duplicate signals filtered out`,
      `${result.route_data?.subreddits?.slice(0, 5).join(', ') || 'Reddit'} produced the strongest signal pool`,
    ].filter(Boolean),
  };
}
