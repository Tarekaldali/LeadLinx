/**
 * LeadLinx V2 Background Worker
 * Core engine for the 6x6 micro-batching loop.
 */

import { getDb } from "./mongodb";
import { fetchRedditPosts } from "./reddit";
import { analyzeLeadsBatch, generateSearchPlan } from "./aiOrchestrator";
import { sendSearchCompletionEmail } from "./email";
import { getTierConfig } from "./pricingConfig";
import { calculateCreditsToDeduct, getRawCost } from "./creditManager";
import { ObjectId } from "mongodb";

/**
 * Local Pre-Filtering Engine
 * Scores posts based on "Buying Intent" keywords to save AI tokens.
 */
function scorePostLocally(post, query) {
  const content = (post.title + " " + post.text).toLowerCase();
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
  
  let score = 0;
  
  // 1. High Intent Categories
  const intentBuckets = {
    // Problem/Pain Signals (The "Why")
    pain: {
      weight: 10,
      terms: [
        "frustrated", "annoying", "tired of", "struggling with", "problem", "hate when", "doesn't work", 
        "broken", "expensive", "waste of money", "fed up", "pissed off", "rubbish", "crap", "bloody", 
        "absolute joke", "nightmare", "clunky", "sucks", "awful", "terrible", "shambles", "waste of time", 
        "garbage", "overpriced", "ripped off", "scam", "useless", "impossible to", "stuck with"
      ]
    },
    // Solution Seeking (The "What")
    seeking: {
      weight: 8,
      terms: [
        "looking for", "recommend", "suggestion", "anyone know", "where can i", "help with", "can someone suggest", 
        "is there a", "advice on", "any tips", "pointers", "reckon", "thoughts on", "best bet", "go-to", 
        "cheapest", "top rated", "must have", "what's the deal", "how do i", "can anyone vouch", "honest opinion",
        "trying to find", "point me to", "best way to"
      ]
    },
    // Buying/Comparison Intent (The "When")
    buying: {
      weight: 12,
      terms: [
        "buying", "purchase", "worth it", "alternative", "best", "which one", "vs", "comparison", "price", 
        "discount", "worth the money", "buy it", "cop", "get my hands on", "invest in", "sign up", "trial", 
        "cheap", "affordable", "deal", "promo", "voucher", "steal", "bang for buck", "budget friendly", 
        "on sale", "where to buy", "cost of"
      ]
    }
  };

  Object.values(intentBuckets).forEach(bucket => {
    bucket.terms.forEach(term => {
      if (content.includes(term)) score += bucket.weight;
    });
  });

  // 2. Query/Product Relevance
  const matchesQuery = queryTerms.some(term => content.includes(term));
  if (matchesQuery) {
    score += 15;
  } else {
    // For general discovery, don't penalize. Let the AI decide.
    score += 5; 
  }

  // 3. Negative Keywords (Noise reduction)
  const negative = ["check out my", "our product", "discount code", "sales", "promotion", "hiring", "job", "career"];
  negative.forEach(term => {
    if (content.includes(term)) score -= 20;
  });

  return score;
}

/**
 * Runs the asynchronous search loop.
 * @param {string} userId - ID of the user who initiated the search
 * @param {string} userQuery - The original query
 * @param {object} searchPlan - { subreddits: [], keywords: [] } from Orchestrator
 */
export async function runBackgroundSearch(userId, userQuery, searchPlan, chatId = null) {
  console.log(`🚀 Starting background scan for User: ${userId} | Query: ${userQuery}`);
  
  try {
    const db = await getDb();
    
    // 1. Get User and Tier Limits
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    const config = getTierConfig(user?.plan || 'free');
    
    // 2. Fetch Initial Batch of Posts from Reddit
    // Save the plan to DB so UI can show "Context"
    await db.collection('searches').updateOne(
      { userId: new ObjectId(userId), query: userQuery, status: 'processing' },
      { $set: { 
          selectedSubreddits: searchPlan.subreddits || [],
          searchQueries: searchPlan.search_queries || []
        } 
      }
    );

    const rawPosts = await fetchRedditPosts(searchPlan.subreddits, searchPlan.search_queries);
    
    // 3. Clean and Pre-filter Data
    const preFilteredPosts = rawPosts
      .filter(post => {
        const wordCount = (post.title + " " + post.text).split(/\s+/).length;
        return wordCount >= 20; // Remove very short posts
      })
      .map(post => ({
        ...post,
        localScore: scorePostLocally(post, userQuery)
      }))
      .filter(post => post.localScore > 0) // Only send posts that have some relevance
      .sort((a, b) => b.localScore - a.localScore); // Process high-intent first

    console.log(`📊 Pre-filtered ${rawPosts.length} down to ${preFilteredPosts.length} high-potential posts.`);

    let foundLeads = [];
    let postsProcessed = 0;
    let totalUsage = { prompt_tokens: 0, completion_tokens: 0 };
    let totalRawCost = 0;
    
    // Add Search Plan usage if available
    if (searchPlan.usage) {
      totalUsage.prompt_tokens += searchPlan.usage.prompt_tokens || 0;
      totalUsage.completion_tokens += searchPlan.usage.completion_tokens || 0;
      totalRawCost += getRawCost("deepseek/deepseek-v4-flash", searchPlan.usage);
    }
    // 4. The 6x6 Micro-Batching Loop (Pass 1)
    async function processPool(pool) {
      let poolProcessed = 0;
      while (foundLeads.length < config.maxLeads && poolProcessed < pool.length && postsProcessed < config.maxPostsAnalyzed) {
        const batch = pool.slice(poolProcessed, poolProcessed + 6);
        console.log(`🔄 Processing batch: ${postsProcessed / 6 + 1} | Leads so far: ${foundLeads.length}/${config.maxLeads}`);
        
        const { leads: analyzedBatch, usage, model } = await analyzeLeadsBatch(batch, userQuery);
        
        if (usage) {
          totalUsage.prompt_tokens += usage.prompt_tokens || 0;
          totalUsage.completion_tokens += usage.completion_tokens || 0;
          totalRawCost += getRawCost(model, usage);
        }

        for (const lead of analyzedBatch) {
          const originalPost = batch.find(p => p.postId === lead.postId);
          if (originalPost && !foundLeads.some(l => l.postId === lead.postId)) {
            foundLeads.push({
              ...originalPost,
              ...lead,
              userId: new ObjectId(userId),
              query: userQuery,
              createdAt: new Date()
            });
          }
        }
        
        poolProcessed += 6;
        postsProcessed += 6;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    await processPool(preFilteredPosts);

    // 5. PERSISTENT DEEP SEARCH: Loop expansion until leads are found
    let searchIteration = 1;
    const maxIterations = 5; 
    let searchedSubreddits = [...(searchPlan.subreddits || [])];

    // Increase budget for deeper searches
    const analysisBudget = config.maxPostsAnalyzed * 2;

    while (foundLeads.length < config.maxLeads && postsProcessed < analysisBudget && searchIteration <= maxIterations) {
      console.log(`🕵️ Deep Search [${searchIteration}/${maxIterations}]: Progress ${foundLeads.length}/${config.maxLeads}. Expanding net...`);
      
      let prompt = `WE NEED LEADS. Current: ${foundLeads.length}/${config.maxLeads}. 
        Already searched: ${searchedSubreddits.slice(-10).join(', ')}. 
        User Query: "${userQuery}".`;

      if (searchIteration >= 3) {
        prompt += `\nCRITICAL: Previous specific searches failed. GO BROAD. 
        Think of general subreddits where people ask for advice. 
        Output 5 VERY BROAD subreddits and 3 SIMPLE queries.`;
      } else {
        prompt += `\nThink outside the box. Find 10 NEW niche subreddits and strategic Boolean queries.`;
      }

      const deepPlan = await generateSearchPlan(prompt);
      
      if (!deepPlan.subreddits || deepPlan.subreddits.length === 0) break;
      
      searchedSubreddits = [...new Set([...searchedSubreddits, ...deepPlan.subreddits])];
      console.log(`🌐 Expanding to: ${deepPlan.subreddits.join(', ')}`);
      
      const deepRawPosts = await fetchRedditPosts(deepPlan.subreddits, deepPlan.search_queries);
      const deepFiltered = deepRawPosts
        .filter(post => (post.title + " " + post.text).split(/\s+/).length >= 20)
        .map(post => ({ ...post, localScore: scorePostLocally(post, userQuery) }))
        .filter(post => post.localScore > 0)
        .sort((a, b) => b.localScore - a.localScore);

      console.log(`📊 Deep Pool ${searchIteration}: ${deepRawPosts.length} posts. Filtered to ${deepFiltered.length}.`);
      
      if (deepFiltered.length > 0) {
        await processPool(deepFiltered);
      } else {
        console.log("⚠️ No high-potential posts found in this expansion. Trying one more time with broader terms...");
      }
      
      searchIteration++;
    }

    console.log(`✅ Final Search Status: Found ${foundLeads.length} leads after ${postsProcessed} posts analyzed.`);

    // 6. Generate Market Insights
    let insights = null;
    if (foundLeads.length > 0) {
      try {
        const { leads: _, usage: insightUsage, model } = await analyzeLeadsBatch(
          foundLeads.slice(0, 5).map(l => ({ title: l.title, text: l.text.substring(0, 300) })),
          `Generate 3 top pain points, 3 trending complaints, and 3 saas/product ideas based on these reddit leads. Format as JSON: {"topPainPoints": [], "trendingComplaints": [], "saasIdeas": []}`
        );
        if (insightUsage) {
          totalUsage.prompt_tokens += insightUsage.prompt_tokens || 0;
          totalUsage.completion_tokens += insightUsage.completion_tokens || 0;
          totalRawCost += getRawCost(model, insightUsage);
        }
        // Since analyzeLeadsBatch uses extractAndParseJSON, we can repurpose it
        // However, it expects an array of leads normally. 
        // Let's call OpenRouter directly for insights to be safer.
        const insightRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-v4-flash",
            messages: [
              // CACHE-HIT OPTIMIZED: static system prompt first, variable lead data in user role.
              { role: "system", content: "You are a market researcher. Synthesize Reddit data into insights. Return JSON ONLY. Format: {\"topPainPoints\": [\"...\"], \"trendingComplaints\": [\"...\"], \"saasIdeas\": [\"...\"]}" },
              { role: "user", content: `Leads: ${JSON.stringify(foundLeads.slice(0, 10))}` }
            ],
            response_format: { type: "json_object" }
          })
        });
        const insightData = await insightRes.json();
        const rawInsights = insightData.choices?.[0]?.message?.content;
        insights = JSON.parse(rawInsights || "{}");
        
        if (insightData.usage) {
          totalUsage.prompt_tokens += insightData.usage.prompt_tokens || 0;
          totalUsage.completion_tokens += insightData.usage.completion_tokens || 0;
          totalRawCost += getRawCost("deepseek/deepseek-v4-flash", insightData.usage);
        }
      } catch (err) {
        console.error("Insights generation failed:", err);
      }
    }

    // 7. Storage & Credits
    const creditsToDeduct = calculateCreditsToDeduct("deepseek/deepseek-v4-flash", totalUsage, user?.plan || 'free');

    // Deduct Credits
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $inc: { credits: -creditsToDeduct } }
    );

    // Record Detailed Usage Log
    const revenue = totalRawCost * 10;
    const profit = revenue - totalRawCost;

    await db.collection('ai_usage').insertOne({
      userId: new ObjectId(userId),
      chatId: chatId ? new ObjectId(chatId) : null,
      type: 'lead_search',
      query: userQuery,
      totalUsage,
      rawCostUsd: totalRawCost,
      totalCostUsd: revenue,
      profitUsd: profit,
      creditsCharged: creditsToDeduct,
      leadsReturned: foundLeads.length,
      postsAnalyzed: postsProcessed,
      plan: user?.plan || 'free',
      timestamp: new Date()
    });

    // 8. Persist Leads First
    if (foundLeads.length > 0) {
      await db.collection('leads').insertMany(foundLeads);
    }

    // 9. Finally Mark as Completed
    await db.collection('searches').updateOne(
      { userId: new ObjectId(userId), query: userQuery, status: 'processing' },
      { 
        $set: { 
          status: 'completed', 
          chatId: chatId ? new ObjectId(chatId) : null,
          leadCount: foundLeads.length,
          creditsCharged: creditsToDeduct,
          insights: insights,
          totalScanned: postsProcessed,
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );

    // 6. Notification
    if (user?.email) {
      await sendSearchCompletionEmail(user.email, foundLeads.length, userQuery, creditsToDeduct);
    }

  } catch (error) {
    console.error("Background Worker Fatal Error:", error);
    // Attempt to mark search as failed
    try {
      const db = await getDb();
      await db.collection('searches').updateOne(
        { userId, query: userQuery },
        { $set: { status: 'failed', error: error.message } }
      );
    } catch (dbErr) {
      console.error("Could not update failure status in DB:", dbErr);
    }
  }
}
