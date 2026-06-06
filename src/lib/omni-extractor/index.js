/**
 * Omni-Extractor — Orchestrator
 * Main entry point for the Multi-Channel Extraction Engine.
 * 
 * V3 RESTORED: Re-integrates generateSearchPlan() from aiOrchestrator
 * for advanced Boolean queries + smarter subreddit selection.
 */

import { routeQuery } from './router.js';
import { validateLeadIntent } from './validator.js';
import { runDorking } from './sources/dorking.js';
import { runSocialExtraction } from './sources/reddit.js';
import { runLocalExtraction } from './sources/local.js';
import { callGemini } from '../gemini.js';
import { generateSearchPlan } from '../aiOrchestrator.js';

export async function extractOmniLeads(query, options = { isPremium: false }) {
  console.log(`\n🚀 [Omni-Extractor] Starting extraction for: "${query}" | Premium: ${options.isPremium}`);
  
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // 1. Intelligent Routing
  const routerResult = await routeQuery(query, true);
  const routeData = routerResult.data;
  totalInputTokens += routerResult.usage.prompt_tokens;
  totalOutputTokens += routerResult.usage.completion_tokens;

  // 2. RESTORED: Generate advanced search plan (Boolean queries + smarter subreddits)
  //    This was the "secret sauce" of the old engine that got disabled.
  let searchPlan = { subreddits: [], search_queries: [query] };
  try {
    searchPlan = await generateSearchPlan(query);
    console.log(`🧠 [Search Plan] Generated ${searchPlan.search_queries.length} Boolean queries, ${searchPlan.subreddits.length} subreddits`);
    
    // Track tokens from search plan
    if (searchPlan.usage) {
      totalInputTokens += searchPlan.usage.prompt_tokens || 0;
      totalOutputTokens += searchPlan.usage.completion_tokens || 0;
    }
  } catch (err) {
    console.warn('[Search Plan] Failed, using router data only:', err.message);
  }

  // 3. Merge router subreddits + search plan subreddits (deduplicated)
  const mergedSubreddits = [...new Set([
    ...(routeData.subreddits || []),
    ...(searchPlan.subreddits || [])
  ])];

  // Merge keywords + search plan queries
  const mergedKeywords = [...new Set([
    ...(routeData.keywords || []),
    ...(searchPlan.search_queries || [])
  ])];

  // Build enriched route data
  const enrichedRouteData = {
    ...routeData,
    subreddits: mergedSubreddits,
    keywords: mergedKeywords,
    searchQueries: searchPlan.search_queries || [query],
    sources: ['social'] // USER REQUEST: Force Reddit only
  };

  console.log(`🗺️ [Omni-Router] Target: ${enrichedRouteData.targetType.toUpperCase()} | Sources: ${enrichedRouteData.sources.join(', ')} | Subreddits: ${mergedSubreddits.join(', ')} | Queries: ${mergedKeywords.length}`);
  
  const rawLeads = [];
  const sourceResults = {};
  const validatedLeads = []; // 4. Parallel Multi-Source Extraction
  const tasks = [];
  
  if (enrichedRouteData.sources.includes('dorking')) {
    tasks.push(
      runDorking(enrichedRouteData, options)
        .then(res => {
          sourceResults.dorking = res.length;
          rawLeads.push(...res);
        })
        .catch(err => {
          sourceResults.dorking = `ERROR: ${err.message}`;
          console.error('[Omni-Extractor] Dorking failed:', err.message);
        })
    );
  }
  
  if (enrichedRouteData.sources.includes('social')) {
    tasks.push(
      runSocialExtraction(enrichedRouteData, options)
        .then(res => {
          sourceResults.social = res.length;
          rawLeads.push(...res);
        })
        .catch(err => {
          sourceResults.social = `ERROR: ${err.message}`;
          console.error('[Omni-Extractor] Social failed:', err.message);
        })
    );
  }
  
  if (enrichedRouteData.sources.includes('local')) {
    tasks.push(
      runLocalExtraction(enrichedRouteData, options)
        .then(res => {
          sourceResults.local = res.length;
          rawLeads.push(...res);
        })
        .catch(err => {
          sourceResults.local = `ERROR: ${err.message}`;
          console.error('[Omni-Extractor] Local failed:', err.message);
        })
    );
  }
  
  await Promise.allSettled(tasks);
  
  console.log(`🔎 [Omni-Extractor] Source results:`, JSON.stringify(sourceResults));
  console.log(`🔎 [Omni-Extractor] Found ${rawLeads.length} raw potential leads across sources.`);
  
  // Increased limits to process more candidates for higher yield
  const MAX_LEADS_TO_PROCESS = options.isPremium ? 80 : 50;
  
  // Prioritize leads with higher heuristic intent score instead of raw length
  const leadsToProcess = [...rawLeads]
    .sort((a, b) => getHeuristicScore(b) - getHeuristicScore(a))
    .slice(0, MAX_LEADS_TO_PROCESS);
    
  // BATCH_SIZE = 15 is a sweet spot to avoid 429s but finish quickly
  const BATCH_SIZE = 15; 
  
  for (let i = 0; i < leadsToProcess.length; i += BATCH_SIZE) {
    const batch = leadsToProcess.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.all(batch.map(async (rawLead) => {
      // FIX: The old code required contactCount > 0 which killed most Reddit leads.
      // Reddit leads are valid with just a username — the reddit:@username social handle
      // is their contact. We now only skip leads with very short context.
      if (!rawLead.context || rawLead.context.trim().length < 20) {
        return { lead: null, usage: { prompt_tokens: 0, completion_tokens: 0 } };
      }
      
      try {
        const valResult = await validateLeadIntent(
          rawLead.context, 
          rawLead.raw_contacts, 
          enrichedRouteData.searchIntent,
          true 
        );

        const validation = valResult.data;
        
        if (validation.is_valid_lead) {
          return {
            lead: {
              id: Math.random().toString(36).substring(2, 15),
              score: Math.round(validation.confidence_score * 100),
              author: validation.lead_name || rawLead.name || 'Unknown',
              company: rawLead.source === 'local_maps' ? rawLead.name : null,
              title: rawLead.title || enrichedRouteData.searchIntent,
              body: rawLead.context?.substring(0, 500) || '',
              link: rawLead.link,
              source: rawLead.source,
              subreddit: rawLead.subreddit || rawLead.source,
              emails: validation.verified_contacts.emails || [],
              phones: validation.verified_contacts.phones || [],
              socials: validation.verified_contacts.socials || [],
              reasoning: validation.reasoning,
              suggestedReply: validation.suggested_reply || '',
              type: validation.lead_type || 'Solution-Seeking',
            },
            usage: valResult.usage
          };
        }
        return { lead: null, usage: valResult.usage };
      } catch (err) {
        console.error('[Omni-Extractor] Validation error:', err.message);
        return { lead: null, usage: { prompt_tokens: 0, completion_tokens: 0 } };
      }
    }));
    
    // Safely accumulate tokens and leads
    results.forEach(res => {
      if (res && res.lead) validatedLeads.push(res.lead);
      if (res && res.usage) {
        totalInputTokens += res.usage.prompt_tokens || 0;
        totalOutputTokens += res.usage.completion_tokens || 0;
      }
    });

    // EARLY STOPPING: Break loop if we have enough leads to prevent Vercel 60s timeout
    const targetLeads = options.isPremium ? 20 : 10;
    if (validatedLeads.length >= targetLeads) {
      console.log(`⏱️ [Omni-Extractor] Early stop: Reached ${validatedLeads.length} leads to avoid 60s Vercel timeout.`);
      break;
    }
  }
  
  validatedLeads.sort((a, b) => b.score - a.score);
  
  console.log(`✅ [Omni-Extractor] Successfully validated ${validatedLeads.length}/${rawLeads.length} leads. Tokens: In=${totalInputTokens}, Out=${totalOutputTokens}`);
  
  return {
    jobId: `omni_${Date.now()}`,
    query: query,
    route_data: enrichedRouteData,
    usage: {
      prompt_tokens: totalInputTokens,
      completion_tokens: totalOutputTokens
    },
    stats: {
      rawFound: rawLeads.length,
      validated: validatedLeads.length,
      sourceResults,
      pagesCrawled: rawLeads.length,
      urlsDiscovered: rawLeads.length,
      duplicatesFiltered: Math.max(0, rawLeads.length - validatedLeads.length),
    },
    leads: validatedLeads
  };
}

/**
 * Fast local heuristic to score raw leads before LLM validation.
 * Prioritizes high-intent buyer signals over massive spam walls.
 */
function getHeuristicScore(lead) {
  const text = lead.context?.toLowerCase() || '';
  let score = 0;
  
  if (text.includes('looking for')) score += 10;
  if (text.includes('recommend')) score += 10;
  if (text.includes('need ')) score += 5;
  if (text.includes('alternative')) score += 10;
  if (text.includes('help')) score += 2;
  if (text.includes('suggest')) score += 8;
  if (text.includes('best ')) score += 5;
  if (text.includes('?')) score += 3;
  
  // Penalize massive megathreads/spam
  if (text.length > 2000) score -= 15; 
  // Penalize ultra short useless comments
  if (text.length < 50) score -= 5; 
  
  return score;
}

